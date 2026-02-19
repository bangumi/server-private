use axum::extract::{Extension, Form, OriginalUri, Query, State};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::Json;
use axum_extra::extract::cookie::{Cookie, Key, SameSite, SignedCookieJar};
use base64::Engine;
use bb8::Pool;
use bb8_redis::redis::AsyncCommands;
use bb8_redis::RedisConnectionManager;
use chrono::{Duration, Utc};
use rand::rngs::OsRng;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sqlx::{Executor, FromRow, MySql};
use url::Url;

use crate::auth::AuthContext;
use crate::error::AppError;
use crate::server::AppState;

const ACCESS_TOKEN_TTL_SECONDS: i64 = 1_209_600;
const REFRESH_TOKEN_TTL_SECONDS: i64 = 8_035_200;
const TOKEN_TYPE_ACCESS_TOKEN: i32 = 1;

const DEFAULT_SCOPES: &[&str] = &[
  "read:collection",
  "write:collection",
  "read:indices",
  "write:indices",
];

const ALL_SCOPES: &[&str] = &[
  "read:collection",
  "write:collection",
  "read:indices",
  "write:indices",
  "read:topic",
  "write:topic",
  "read:wiki",
  "write:wiki",
];

pub(crate) async fn authorize_get(
  State(state): State<AppState>,
  Extension(auth): Extension<AuthContext>,
  OriginalUri(uri): OriginalUri,
  Query(query): Query<AuthorizeQuery>,
  jar: SignedCookieJar,
) -> Result<Response, AppError> {
  if !auth.login {
    return Ok(login_redirect(&uri).into_response());
  }

  let user = sqlx::query_as::<_, UserViewRow>(
    "select username, nickname, avatar from chii_members where uid = ? limit 1",
  )
  .bind(auth.user_id)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| {
    AppError::internal(format!("failed to load current user: {error}"))
  })?;

  let Some(user) = user else {
    return Ok(login_redirect(&uri).into_response());
  };

  if query.response_type != "code" {
    let html = render_authorize_error(&state, "Invalid response type")?;
    return Ok(html.into_response());
  }

  let client = sqlx::query_as::<_, OauthClientViewRow>(
    r#"
      SELECT
        c.client_id,
        c.redirect_uri,
        a.app_name,
        a.app_desc,
        a.app_timestamp,
        m.username AS creator_username,
        m.nickname AS creator_nickname,
        m.avatar AS creator_avatar
      FROM chii_oauth_clients c
      INNER JOIN chii_apps a ON a.app_id = c.app_id
      INNER JOIN chii_members m ON m.uid = a.app_creator
      WHERE c.client_id = ?
      LIMIT 1
    "#,
  )
  .bind(&query.client_id)
  .fetch_optional(&state.mysql_pool)
  .await
  .map_err(|error| {
    AppError::internal(format!("failed to load oauth client: {error}"))
  })?;

  let Some(client) = client else {
    let html = render_authorize_error(&state, "App does not exist")?;
    return Ok(html.into_response());
  };

  if client.redirect_uri.is_empty() {
    let html = render_authorize_error(&state, "client missing redirect_uri config")?;
    return Ok(html.into_response());
  }

  if let Some(redirect_uri) = &query.redirect_uri {
    if redirect_uri != &client.redirect_uri {
      let html = render_authorize_error(&state, "Redirect URI mismatch")?;
      return Ok(html.into_response());
    }
  }

  let requested_scope = query.scope.clone().unwrap_or_default();
  let parsed_scope = parse_scope(&requested_scope).map_err(AppError::bad_request)?;

  let (jar, cookie_value) = issue_or_get_csrf_cookie(jar, auth.user_id);

  let html = render_authorize_ready(
    &state,
    AuthorizeReadyView {
      title: "授权应用访问",
      app: AppView {
        app_name: client.app_name,
        app_desc: client.app_desc,
        app_created_at: client.app_timestamp,
      },
      client: ClientView {
        client_id: client.client_id,
        redirect_uri: client.redirect_uri,
      },
      creator: UserView {
        username: client.creator_username,
        nickname: client.creator_nickname,
        avatar: client.creator_avatar,
      },
      user: UserView {
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      csrf_token: cookie_value.clone(),
      state: query.state,
      scope_raw: requested_scope,
      scopes: scope_message(&parsed_scope),
    },
  )?;

  Ok((jar, html).into_response())
}

pub(crate) async fn authorize_post(
  State(state): State<AppState>,
  Extension(auth): Extension<AuthContext>,
  jar: SignedCookieJar,
  Form(form): Form<AuthorizePostForm>,
) -> Result<Response, AppError> {
  if !auth.login {
    return Err(AppError::unauthorized(
      "you need to login before oauth authorize",
    ));
  }

  if !verify_csrf_form(&jar, &form.csrf_token, auth.user_id) {
    return Err(AppError::bad_request("Invalid CSRF token"));
  }

  let client = load_oauth_client_redirect_uri(
    &state.mysql_pool,
    &form.client_id,
    AppNotFound::AppDoesNotExist,
  )
  .await?;

  if client.redirect_uri != form.redirect_uri {
    return Err(AppError::bad_request("Redirect URI mismatch"));
  }

  let scope_raw = form.scope.unwrap_or_default();
  let scope = parse_scope(&scope_raw).map_err(AppError::bad_request)?;

  let code = random_base64url(30);

  let auth_info = AuthCodeInfo {
    user_id: auth.user_id.to_string(),
    scope,
  };

  let mut redis = state.redis_pool.get().await.map_err(|error| {
    AppError::internal(format!("failed to get redis connection: {error}"))
  })?;

  redis
    .set_ex::<_, _, ()>(
      format!("oauth:code:{code}"),
      serde_json::to_string(&auth_info).map_err(|error| {
        AppError::internal(format!("failed to encode auth code info: {error}"))
      })?,
      60,
    )
    .await
    .map_err(|error| {
      AppError::internal(format!("failed to write auth code: {error}"))
    })?;

  let mut redirect_uri = Url::parse(&client.redirect_uri)
    .map_err(|error| AppError::bad_request(format!("invalid redirect uri: {error}")))?;
  redirect_uri.query_pairs_mut().append_pair("code", &code);
  if let Some(state_value) = form.state {
    redirect_uri
      .query_pairs_mut()
      .append_pair("state", &state_value);
  }

  Ok(Redirect::to(redirect_uri.as_str()).into_response())
}

pub(crate) async fn access_token_post(
  State(state): State<AppState>,
  Form(form): Form<AccessTokenForm>,
) -> Result<Json<TokenResponse>, AppError> {
  match form.grant_type.as_str() {
    "authorization_code" => {
      let code = form
        .code
        .ok_or_else(|| AppError::bad_request("Authorization code is missing"))?;
      token_from_code(
        &state,
        TokenFromCodeRequest {
          code,
          client_id: form.client_id,
          client_secret: form.client_secret,
          redirect_uri: form.redirect_uri,
        },
      )
      .await
      .map(Json)
    }
    "refresh_token" => {
      let refresh_token = form
        .refresh_token
        .ok_or_else(|| AppError::bad_request("Refresh token is missing"))?;
      token_from_refresh(
        &state,
        TokenFromRefreshRequest {
          refresh_token,
          client_id: form.client_id,
          client_secret: form.client_secret,
          redirect_uri: form.redirect_uri,
        },
      )
      .await
      .map(Json)
    }
    _ => Err(AppError::bad_request("Invalid grant type")),
  }
}

fn login_redirect(uri: &axum::http::Uri) -> Redirect {
  let back_to = uri.to_string();
  Redirect::to(&format!("/login?backTo={}", urlencoding::encode(&back_to)))
}

fn render_authorize_ready(
  state: &AppState,
  view: AuthorizeReadyView,
) -> Result<Html<String>, AppError> {
  let html = state
    .templates
    .render("oauth/authorize.html", &view)
    .map_err(|error| {
      AppError::internal(format!("failed to render oauth template: {error}"))
    })?;
  Ok(Html(html))
}

fn render_authorize_error(
  state: &AppState,
  message: &str,
) -> Result<Html<String>, AppError> {
  let html = state
    .templates
    .render(
      "oauth/error.html",
      &AuthorizeErrorView {
        title: "授权应用访问",
        error: message.to_owned(),
      },
    )
    .map_err(|error| {
      AppError::internal(format!("failed to render oauth template: {error}"))
    })?;
  Ok(Html(html))
}

fn parse_scope(scope: &str) -> Result<Vec<String>, String> {
  if scope.trim().is_empty() {
    return Ok(DEFAULT_SCOPES.iter().map(|s| (*s).to_owned()).collect());
  }

  let mut result = Vec::new();
  for item in scope.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()) {
    if !ALL_SCOPES.contains(&item) {
      return Err(format!("invalid scope: {item}"));
    }
    result.push(item.to_owned());
  }

  Ok(result)
}

fn scope_message(scopes: &[String]) -> Vec<ScopeMessage> {
  let mut messages = Vec::new();
  for scope in scopes {
    let mode = if scope.starts_with("write:") {
      "write"
    } else {
      "read"
    };
    messages.push(ScopeMessage {
      mode: mode.to_owned(),
      description: scope_description(scope).to_owned(),
    });
  }
  messages
}

fn scope_description(scope: &str) -> &'static str {
  match scope {
    "read:collection" => "获取用户收藏",
    "write:collection" => "修改用户收藏",
    "read:indices" => "读取目录",
    "write:indices" => "修改目录",
    "read:topic" => "读取帖子数据",
    "write:topic" => "发帖/回帖",
    "read:wiki" => "获取维基数据",
    "write:wiki" => "进行维基编辑",
    _ => "未知权限",
  }
}

async fn token_from_code(
  state: &AppState,
  req: TokenFromCodeRequest,
) -> Result<TokenResponse, AppError> {
  let client = load_oauth_client_app(
    &state.mysql_pool,
    &req.client_id,
    AppNotFound::AppDoesNotExist,
  )
  .await?;

  if client.redirect_uri != req.redirect_uri {
    return Err(AppError::bad_request("Redirect URI mismatch"));
  }
  if client.client_secret != req.client_secret {
    return Err(AppError::bad_request("Invalid client secret"));
  }

  let mut redis = state.redis_pool.get().await.map_err(|error| {
    AppError::internal(format!("failed to get redis connection: {error}"))
  })?;

  let auth_key = format!("oauth:code:{}", req.code);
  let auth_info_raw = redis
    .get::<_, Option<String>>(&auth_key)
    .await
    .map_err(|error| AppError::internal(format!("failed to read auth code: {error}")))?
    .ok_or_else(|| AppError::bad_request("Invalid authorization code"))?;

  let auth_info: AuthCodeInfo =
    serde_json::from_str(&auth_info_raw).map_err(|error| {
      AppError::internal(format!("invalid auth code payload: {error}"))
    })?;

  redis.del::<_, ()>(&auth_key).await.map_err(|error| {
    AppError::internal(format!("failed to consume auth code: {error}"))
  })?;

  let now = Utc::now();
  let expires_at = now + Duration::seconds(ACCESS_TOKEN_TTL_SECONDS);
  let refresh_expires_at = now + Duration::seconds(REFRESH_TOKEN_TTL_SECONDS);

  let access_token = random_base64url(30);
  let refresh_token = random_base64url(30);

  let scope_raw = serde_json::to_string(&auth_info.scope)
    .map_err(|error| AppError::internal(format!("failed to encode scope: {error}")))?;
  let info_raw = serde_json::json!({
    "name": client.app_name,
    "created_at": now.to_rfc3339(),
  })
  .to_string();

  let mut tx = state.mysql_pool.begin().await.map_err(|error| {
    AppError::internal(format!("failed to start db transaction: {error}"))
  })?;

  sqlx::query(
    r#"
      INSERT INTO chii_oauth_access_tokens (`type`, access_token, client_id, user_id, expires, scope, info)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    "#,
  )
  .bind(TOKEN_TYPE_ACCESS_TOKEN)
  .bind(&access_token)
  .bind(&client.client_id)
  .bind(&auth_info.user_id)
  .bind(expires_at)
  .bind(&scope_raw)
  .bind(&info_raw)
  .execute(&mut *tx)
  .await
  .map_err(|error| AppError::internal(format!("failed to insert access token: {error}")))?;

  sqlx::query(
    r#"
      INSERT INTO chii_oauth_refresh_tokens (refresh_token, client_id, user_id, expires, scope)
      VALUES (?, ?, ?, ?, ?)
    "#,
  )
  .bind(&refresh_token)
  .bind(&client.client_id)
  .bind(&auth_info.user_id)
  .bind(refresh_expires_at)
  .bind(&scope_raw)
  .execute(&mut *tx)
  .await
  .map_err(|error| AppError::internal(format!("failed to insert refresh token: {error}")))?;

  tx.commit().await.map_err(|error| {
    AppError::internal(format!("failed to commit token transaction: {error}"))
  })?;

  Ok(TokenResponse {
    access_token,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: "Bearer".to_owned(),
    refresh_token,
    user_id: auth_info.user_id,
    scope: None,
  })
}

async fn token_from_refresh(
  state: &AppState,
  req: TokenFromRefreshRequest,
) -> Result<TokenResponse, AppError> {
  let mut tx = state.mysql_pool.begin().await.map_err(|error| {
    AppError::internal(format!("failed to start db transaction: {error}"))
  })?;

  let refresh = load_refresh_token_for_update(&mut *tx, &req.refresh_token).await?;

  let client =
    load_oauth_client_app(&mut *tx, &req.client_id, AppNotFound::InvalidClientId)
      .await?;

  if client.redirect_uri != req.redirect_uri {
    return Err(AppError::bad_request("Redirect URI mismatch"));
  }
  if client.client_secret != req.client_secret {
    return Err(AppError::bad_request("Invalid client secret"));
  }

  let now = Utc::now();
  let expires_at = now + Duration::seconds(ACCESS_TOKEN_TTL_SECONDS);
  let refresh_expires_at = now + Duration::seconds(REFRESH_TOKEN_TTL_SECONDS);

  let access_token = random_base64url(30);
  let new_refresh_token = random_base64url(30);

  let info_raw = serde_json::json!({
    "name": client.app_name,
    "created_at": now.to_rfc3339(),
  })
  .to_string();

  sqlx::query(
    r#"
      INSERT INTO chii_oauth_access_tokens (`type`, access_token, client_id, user_id, expires, scope, info)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    "#,
  )
  .bind(TOKEN_TYPE_ACCESS_TOKEN)
  .bind(&access_token)
  .bind(&client.client_id)
  .bind(&refresh.user_id)
  .bind(expires_at)
  .bind(&refresh.scope)
  .bind(&info_raw)
  .execute(&mut *tx)
  .await
  .map_err(|error| AppError::internal(format!("failed to insert access token: {error}")))?;

  sqlx::query(
    r#"
      INSERT INTO chii_oauth_refresh_tokens (refresh_token, client_id, user_id, expires, scope)
      VALUES (?, ?, ?, ?, ?)
    "#,
  )
  .bind(&new_refresh_token)
  .bind(&client.client_id)
  .bind(&refresh.user_id)
  .bind(refresh_expires_at)
  .bind(&refresh.scope)
  .execute(&mut *tx)
  .await
  .map_err(|error| AppError::internal(format!("failed to insert refresh token: {error}")))?;

  sqlx::query(
    "UPDATE chii_oauth_refresh_tokens SET expires = ? WHERE refresh_token = ? collate utf8mb4_bin",
  )
  .bind(now)
  .bind(&req.refresh_token)
  .execute(&mut *tx)
  .await
  .map_err(|error| AppError::internal(format!("failed to revoke old refresh token: {error}")))?;

  tx.commit().await.map_err(|error| {
    AppError::internal(format!("failed to commit token transaction: {error}"))
  })?;

  Ok(TokenResponse {
    access_token,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: "Bearer".to_owned(),
    refresh_token: new_refresh_token,
    user_id: refresh.user_id,
    scope: None,
  })
}

fn issue_or_get_csrf_cookie(
  mut jar: SignedCookieJar,
  user_id: i64,
) -> (SignedCookieJar, String) {
  if jar.get("csrf-secret").is_some() {
    if let Some(raw) = raw_cookie_value(&jar, "csrf-secret") {
      return (jar, raw);
    }
  }

  let payload = format!("{user_id}:{}", random_base64url(30));
  let cookie = Cookie::build(("csrf-secret", payload.clone()))
    .path("/")
    .http_only(true)
    .secure(true)
    .same_site(SameSite::Lax)
    .build();

  jar = jar.add(cookie);
  let form_token =
    raw_cookie_value(&jar, "csrf-secret").unwrap_or_else(|| payload.clone());
  (jar, form_token)
}

fn verify_csrf_form(jar: &SignedCookieJar, form_token: &str, user_id: i64) -> bool {
  let Some(raw_cookie) = raw_cookie_value(jar, "csrf-secret") else {
    return false;
  };
  if raw_cookie != form_token {
    return false;
  }

  let Some(cookie) = jar.get("csrf-secret") else {
    return false;
  };

  let value = cookie.value();
  value.starts_with(&format!("{user_id}:"))
}

fn raw_cookie_value(jar: &SignedCookieJar, name: &str) -> Option<String> {
  jar
    .iter()
    .find(|cookie| cookie.name() == name)
    .map(|cookie| cookie.value().to_owned())
}

fn random_base64url(size: usize) -> String {
  let mut bytes = vec![0_u8; size];
  OsRng.fill_bytes(&mut bytes);
  base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}

async fn load_oauth_client_redirect_uri<'e, E>(
  exec: E,
  client_id: &str,
  not_found: AppNotFound,
) -> Result<OauthClientRow, AppError>
where
  E: Executor<'e, Database = MySql>,
{
  sqlx::query_as::<_, OauthClientRow>(
    "select redirect_uri from chii_oauth_clients where client_id = ? limit 1",
  )
  .bind(client_id)
  .fetch_optional(exec)
  .await
  .map_err(|error| {
    AppError::internal(format!("failed to query oauth client: {error}"))
  })?
  .ok_or_else(|| app_not_found_error(not_found))
}

async fn load_oauth_client_app<'e, E>(
  exec: E,
  client_id: &str,
  not_found: AppNotFound,
) -> Result<OauthClientAppRow, AppError>
where
  E: Executor<'e, Database = MySql>,
{
  sqlx::query_as::<_, OauthClientAppRow>(
    r#"
      SELECT
        c.client_id,
        c.client_secret,
        c.redirect_uri,
        a.app_name
      FROM chii_oauth_clients c
      INNER JOIN chii_apps a ON a.app_id = c.app_id
      WHERE c.client_id = ?
      LIMIT 1
    "#,
  )
  .bind(client_id)
  .fetch_optional(exec)
  .await
  .map_err(|error| {
    AppError::internal(format!("failed to query oauth client: {error}"))
  })?
  .ok_or_else(|| app_not_found_error(not_found))
}

fn app_not_found_error(kind: AppNotFound) -> AppError {
  match kind {
    AppNotFound::AppDoesNotExist => AppError::not_found("App does not exist"),
    AppNotFound::InvalidClientId => AppError::bad_request("Invalid client ID"),
  }
}

async fn load_refresh_token_for_update<'e, E>(
  exec: E,
  refresh_token: &str,
) -> Result<RefreshTokenRow, AppError>
where
  E: Executor<'e, Database = MySql>,
{
  sqlx::query_as::<_, RefreshTokenRow>(
    r#"
      SELECT user_id, scope
      FROM chii_oauth_refresh_tokens
      WHERE refresh_token = ? collate utf8mb4_bin AND expires > now()
      LIMIT 1
      FOR UPDATE
    "#,
  )
  .bind(refresh_token)
  .fetch_optional(exec)
  .await
  .map_err(|error| {
    AppError::internal(format!("failed to query refresh token: {error}"))
  })?
  .ok_or_else(|| AppError::bad_request("Invalid refresh token or expired"))
}

#[derive(Debug, Deserialize)]
pub(crate) struct AuthorizeQuery {
  client_id: String,
  response_type: String,
  redirect_uri: Option<String>,
  scope: Option<String>,
  state: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct AuthorizePostForm {
  csrf_token: String,
  client_id: String,
  redirect_uri: String,
  scope: Option<String>,
  state: Option<String>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct AccessTokenForm {
  grant_type: String,
  client_id: String,
  client_secret: String,
  code: Option<String>,
  refresh_token: Option<String>,
  redirect_uri: String,
}

#[derive(Debug, Serialize)]
pub(crate) struct TokenResponse {
  access_token: String,
  expires_in: i64,
  token_type: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  scope: Option<String>,
  refresh_token: String,
  user_id: String,
}

#[derive(Debug, Clone, Copy)]
enum AppNotFound {
  AppDoesNotExist,
  InvalidClientId,
}

#[derive(Debug, Serialize)]
struct AuthorizeReadyView {
  title: &'static str,
  app: AppView,
  client: ClientView,
  creator: UserView,
  user: UserView,
  csrf_token: String,
  state: Option<String>,
  scope_raw: String,
  scopes: Vec<ScopeMessage>,
}

#[derive(Debug, Serialize)]
struct AuthorizeErrorView {
  title: &'static str,
  error: String,
}

#[derive(Debug, Serialize)]
struct ScopeMessage {
  mode: String,
  description: String,
}

#[derive(Debug, Serialize)]
struct AppView {
  app_name: String,
  app_desc: String,
  app_created_at: i64,
}

#[derive(Debug, Serialize)]
struct ClientView {
  client_id: String,
  redirect_uri: String,
}

#[derive(Debug, Serialize)]
struct UserView {
  username: String,
  nickname: String,
  avatar: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct AuthCodeInfo {
  #[serde(rename = "userID", alias = "user_id")]
  user_id: String,
  scope: Vec<String>,
}

#[derive(Debug)]
struct TokenFromCodeRequest {
  code: String,
  client_id: String,
  client_secret: String,
  redirect_uri: String,
}

#[derive(Debug)]
struct TokenFromRefreshRequest {
  refresh_token: String,
  client_id: String,
  client_secret: String,
  redirect_uri: String,
}

#[derive(Debug, FromRow)]
struct UserViewRow {
  username: String,
  nickname: String,
  avatar: String,
}

#[derive(Debug, FromRow)]
struct OauthClientRow {
  redirect_uri: String,
}

#[derive(Debug, FromRow)]
struct OauthClientAppRow {
  client_id: String,
  client_secret: String,
  redirect_uri: String,
  app_name: String,
}

#[derive(Debug, FromRow)]
struct OauthClientViewRow {
  client_id: String,
  redirect_uri: String,
  app_name: String,
  app_desc: String,
  app_timestamp: i64,
  creator_username: String,
  creator_nickname: String,
  creator_avatar: String,
}

#[derive(Debug, FromRow)]
struct RefreshTokenRow {
  user_id: String,
  scope: Option<String>,
}

pub(crate) type RedisPool = Pool<RedisConnectionManager>;

pub(crate) fn cookie_signing_key(secret: &str) -> Key {
  let secret_bytes = secret.as_bytes();
  let mut key_bytes = [0_u8; 64];
  if secret_bytes.is_empty() {
    return Key::from(&key_bytes);
  }

  for (index, target) in key_bytes.iter_mut().enumerate() {
    *target = secret_bytes[index % secret_bytes.len()];
  }

  Key::from(&key_bytes)
}

#[cfg(test)]
mod tests {
  use axum::body::to_bytes;
  use axum::body::Body;
  use axum::http::{header, Request, StatusCode};
  use serde_json::Value;
  use tower::util::ServiceExt;

  use super::{
    app_not_found_error, parse_scope, AppNotFound, AuthCodeInfo, TokenResponse,
    DEFAULT_SCOPES,
  };
  use crate::server::build_test_router;

  #[test]
  fn parse_scope_empty_uses_default_scope_set() {
    let parsed = parse_scope("   ").expect("empty scope should use defaults");
    let expected: Vec<String> = DEFAULT_SCOPES
      .iter()
      .map(|scope| (*scope).to_owned())
      .collect();
    assert_eq!(parsed, expected);
  }

  #[test]
  fn parse_scope_rejects_unknown_scope() {
    let error =
      parse_scope("read:collection,write:unknown").expect_err("scope should fail");
    assert_eq!(error, "invalid scope: write:unknown");
  }

  #[test]
  fn token_response_omits_scope_field_when_none() {
    let body = serde_json::to_value(TokenResponse {
      access_token: "a".to_owned(),
      expires_in: 1,
      token_type: "Bearer".to_owned(),
      scope: None,
      refresh_token: "r".to_owned(),
      user_id: "1".to_owned(),
    })
    .expect("token response should serialize");

    assert!(body.get("scope").is_none());
  }

  #[test]
  fn app_not_found_error_semantics_match_oauth_contract() {
    let app_missing = app_not_found_error(AppNotFound::AppDoesNotExist);
    assert_eq!(app_missing.status, StatusCode::NOT_FOUND);
    assert_eq!(app_missing.message, "App does not exist");

    let invalid_client = app_not_found_error(AppNotFound::InvalidClientId);
    assert_eq!(invalid_client.status, StatusCode::BAD_REQUEST);
    assert_eq!(invalid_client.message, "Invalid client ID");
  }

  #[test]
  fn auth_code_info_deserializes_both_ts_and_rust_field_names() {
    let ts_payload = r#"{"userID":"123","scope":["read:collection"]}"#;
    let rust_payload = r#"{"user_id":"456","scope":["read:indices"]}"#;

    let ts: AuthCodeInfo =
      serde_json::from_str(ts_payload).expect("ts payload should parse");
    let rust: AuthCodeInfo =
      serde_json::from_str(rust_payload).expect("rust payload should parse");

    assert_eq!(ts.user_id, "123");
    assert_eq!(rust.user_id, "456");

    let encoded = serde_json::to_string(&ts).expect("payload should serialize");
    assert!(encoded.contains("\"userID\""));
    assert!(!encoded.contains("\"user_id\""));
  }

  #[tokio::test]
  async fn oauth_authorize_get_redirects_when_not_logged_in() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .uri("/oauth/authorize?client_id=test&response_type=code")
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("authorize route should respond");

    assert_eq!(response.status(), StatusCode::SEE_OTHER);
    let location = response
      .headers()
      .get(header::LOCATION)
      .and_then(|value| value.to_str().ok())
      .expect("redirect location should exist");
    assert!(location.starts_with("/login?backTo="));
  }

  #[tokio::test]
  async fn oauth_authorize_post_requires_login() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .method("POST")
          .uri("/oauth/authorize")
          .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
          .body(Body::from("csrf_token=a&client_id=b&redirect_uri=c&scope="))
          .expect("request"),
      )
      .await
      .expect("authorize post should respond");

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
  }

  #[tokio::test]
  async fn oauth_access_token_validates_grant_payload() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .method("POST")
          .uri("/oauth/access_token")
          .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
          .body(Body::from(
            "grant_type=authorization_code&client_id=test&client_secret=sec&redirect_uri=http%3A%2F%2Fexample.com",
          ))
          .expect("request"),
      )
      .await
      .expect("access token should respond");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value =
      serde_json::from_slice(&body).expect("error body should be valid json");
    assert_eq!(parsed["message"], "Authorization code is missing");
  }

  #[tokio::test]
  async fn oauth_access_token_rejects_invalid_grant_type() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .method("POST")
          .uri("/oauth/access_token")
          .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
          .body(Body::from(
            "grant_type=invalid_type&client_id=test&client_secret=sec&redirect_uri=http%3A%2F%2Fexample.com",
          ))
          .expect("request"),
      )
      .await
      .expect("access token should respond");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value =
      serde_json::from_slice(&body).expect("error body should be valid json");
    assert_eq!(parsed["message"], "Invalid grant type");
  }

  #[tokio::test]
  async fn oauth_access_token_refresh_requires_refresh_token() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .method("POST")
          .uri("/oauth/access_token")
          .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
          .body(Body::from(
            "grant_type=refresh_token&client_id=test&client_secret=sec&redirect_uri=http%3A%2F%2Fexample.com",
          ))
          .expect("request"),
      )
      .await
      .expect("access token should respond");

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value =
      serde_json::from_slice(&body).expect("error body should be valid json");
    assert_eq!(parsed["message"], "Refresh token is missing");
  }
}
