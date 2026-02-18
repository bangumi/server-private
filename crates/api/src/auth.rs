use std::collections::HashMap;

use axum::extract::{Request, State};
use axum::http::{header, HeaderMap};
use axum::middleware::Next;
use axum::response::Response;
use base64::Engine;
use chrono::Utc;
use serde::Serialize;
use sqlx::FromRow;
use utoipa::ToSchema;

use crate::error::AppError;
use crate::server::AppState;

const TOKEN_PREFIX: &str = "Bearer ";
const DEFAULT_SOURCE: i32 = 6;
const SESSION_COOKIE_KEY: &str = "chiiNextSessionID";
const LEGACY_COOKIE_KEY: &str = "chii_auth";

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct AuthContext {
  pub user_id: i64,
  pub login: bool,
  pub group_id: i32,
  pub reg_time: i64,
  pub source: i32,
}

impl AuthContext {
  fn anonymous() -> Self {
    Self {
      user_id: 0,
      login: false,
      group_id: 0,
      reg_time: 0,
      source: DEFAULT_SOURCE,
    }
  }

  fn from_user(user: UserRow) -> Self {
    Self {
      user_id: user.uid,
      login: true,
      group_id: user.groupid,
      reg_time: user.regdate,
      source: DEFAULT_SOURCE,
    }
  }
}

pub(crate) async fn auth_middleware(
  State(state): State<AppState>,
  mut req: Request,
  next: Next,
) -> Result<Response, AppError> {
  let auth = authenticate(&state, req.headers()).await?;
  req.extensions_mut().insert(auth);
  Ok(next.run(req).await)
}

async fn authenticate(state: &AppState, headers: &HeaderMap) -> Result<AuthContext, AppError> {
  if let Some(authorization) = headers.get(header::AUTHORIZATION) {
    return authenticate_bearer(state, authorization.to_str().map_err(|_| {
      AppError::unauthorized("authorization header contains invalid utf8")
    })?)
    .await;
  }

  if let Some(user) = authenticate_legacy_session(state, headers).await? {
    return Ok(user);
  }

  if let Some(user) = authenticate_session(state, headers).await? {
    return Ok(user);
  }

  Ok(AuthContext::anonymous())
}

async fn authenticate_bearer(state: &AppState, authorization: &str) -> Result<AuthContext, AppError> {
  if !authorization.starts_with(TOKEN_PREFIX) {
    return Err(AppError::unauthorized(
      "authorization header should have \"Bearer ${TOKEN}\" format",
    ));
  }

  let token = authorization[TOKEN_PREFIX.len()..].trim();
  if token.is_empty() {
    return Err(AppError::unauthorized("authorization header missing token"));
  }

  let user_id_raw = sqlx::query_scalar::<_, String>(
    "select user_id from chii_oauth_access_tokens where access_token = ? collate utf8mb4_bin and expires > now() limit 1",
  )
  .bind(token)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| AppError::internal(format!("failed to check bearer token: {error}")))?
  .ok_or_else(|| AppError::unauthorized("can't find access token or it has been expired"))?;

  let user_id = user_id_raw.parse::<i64>().map_err(|_| {
    AppError::internal("access token row has invalid user_id format")
  })?;

  fetch_user_auth(state, user_id).await
}

async fn authenticate_session(
  state: &AppState,
  headers: &HeaderMap,
) -> Result<Option<AuthContext>, AppError> {
  let cookies = parse_cookies(headers);
  let Some(session_id) = cookies.get(SESSION_COOKIE_KEY) else {
    return Ok(None);
  };

  let now_unix = Utc::now().timestamp();
  let user_id = sqlx::query_scalar::<_, i64>(
    "select user_id from chii_os_web_sessions where `key` = ? collate utf8mb4_bin and expired_at > ? limit 1",
  )
  .bind(session_id)
  .bind(now_unix)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| AppError::internal(format!("failed to check session token: {error}")))?;

  match user_id {
    Some(user_id) => fetch_user_auth(state, user_id).await.map(Some),
    None => Ok(None),
  }
}

async fn authenticate_legacy_session(
  state: &AppState,
  headers: &HeaderMap,
) -> Result<Option<AuthContext>, AppError> {
  let cookies = parse_cookies(headers);
  let Some(raw_cookie) = cookies.get(LEGACY_COOKIE_KEY) else {
    return Ok(None);
  };

  let Some(user_agent) = headers
    .get(header::USER_AGENT)
    .and_then(|value| value.to_str().ok())
  else {
    return Ok(None);
  };

  let key = md5_hex(&(state.config.php_session_secret_key.clone() + user_agent));
  let Some(decoded) = decode_authcode(raw_cookie, &key) else {
    return Ok(None);
  };

  let mut parts = decoded.split('\t');
  let Some(password_crypt) = parts.next() else {
    return Ok(None);
  };
  let Some(user_id_raw) = parts.next() else {
    return Ok(None);
  };

  let user_id = user_id_raw.parse::<i64>().map_err(|_| {
    AppError::bad_request("legacy session contains invalid user id")
  })?;

  let db_password = sqlx::query_scalar::<_, String>(
    "select password_crypt from chii_members where uid = ? limit 1",
  )
  .bind(user_id)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| AppError::internal(format!("failed to check legacy session: {error}")))?;

  if db_password.as_deref() != Some(password_crypt) {
    return Ok(None);
  }

  fetch_user_auth(state, user_id).await.map(Some)
}

async fn fetch_user_auth(state: &AppState, user_id: i64) -> Result<AuthContext, AppError> {
  let user = sqlx::query_as::<_, UserRow>(
    "select uid, groupid, regdate from chii_members where uid = ? limit 1",
  )
  .bind(user_id)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| AppError::internal(format!("failed to fetch user: {error}")))?
  .ok_or_else(|| AppError::unauthorized("user does not exist"))?;

  Ok(AuthContext::from_user(user))
}

#[derive(Debug, FromRow)]
struct UserRow {
  uid: i64,
  groupid: i32,
  regdate: i64,
}

fn parse_cookies(headers: &HeaderMap) -> HashMap<String, String> {
  let mut cookies = HashMap::new();

  for header_value in headers.get_all(header::COOKIE) {
    let Ok(cookie_line) = header_value.to_str() else {
      continue;
    };

    for pair in cookie_line.split(';') {
      let pair = pair.trim();
      if pair.is_empty() {
        continue;
      }

      let mut segments = pair.splitn(2, '=');
      let Some(name) = segments.next() else {
        continue;
      };
      let Some(value) = segments.next() else {
        continue;
      };

      cookies.insert(name.to_owned(), value.to_owned());
    }
  }

  cookies
}

fn md5_hex(input: &str) -> String {
  format!("{:x}", md5::compute(input.as_bytes()))
}

fn decode_authcode(input: &str, key: &str) -> Option<String> {
  let key = md5_hex(key);
  let data = decode_base64_without_padding(input)?;

  let key_bytes = key.as_bytes();
  if key_bytes.is_empty() {
    return None;
  }

  let mut random_key = [0u8; 256];
  let mut box_map = [0u8; 256];
  for i in 0..256usize {
    random_key[i] = key_bytes[i % key_bytes.len()];
    box_map[i] = i as u8;
  }

  let mut j = 0usize;
  for i in 0..256usize {
    j = (j + box_map[i] as usize + random_key[i] as usize) % 256;
    box_map.swap(i, j);
  }

  let mut a = 0usize;
  j = 0;
  let mut result = Vec::with_capacity(data.len());
  for byte in data {
    a = (a + 1) % 256;
    j = (j + box_map[a] as usize) % 256;
    box_map.swap(a, j);
    let key_byte = box_map[(box_map[a] as usize + box_map[j] as usize) % 256];
    result.push(byte ^ key_byte);
  }

  let decoded = String::from_utf8(result).ok()?;
  if decoded.len() < 8 {
    return None;
  }

  let payload = &decoded[8..];
  if decoded[..8] != md5_hex(&(payload.to_owned() + &key))[..8] {
    return None;
  }

  Some(payload.to_owned())
}

fn decode_base64_without_padding(input: &str) -> Option<Vec<u8>> {
  let mut normalized = input.to_owned();
  let remainder = normalized.len() % 4;
  if remainder != 0 {
    normalized.push_str(&"=".repeat(4 - remainder));
  }

  base64::engine::general_purpose::STANDARD
    .decode(normalized)
    .ok()
}
