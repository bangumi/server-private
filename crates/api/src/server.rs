use std::path::PathBuf;

use anyhow::{Context, Result};
use axum::extract::{Extension, FromRef};
use axum::middleware;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use axum_extra::extract::cookie::Key;
use bangumi_config::AppConfig;
use bb8::Pool;
use bb8_redis::RedisConnectionManager;
use serde::Serialize;
use spdlog::info;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;
use utoipa::{OpenApi, ToSchema};

use crate::auth::{self, AuthContext};
use crate::oauth;
use crate::oauth::RedisPool;
use crate::template::TemplateEngine;

#[derive(Clone)]
pub(crate) struct AppState {
  pub config: AppConfig,
  pub mysql_pool: MySqlPool,
  pub redis_pool: RedisPool,
  pub templates: TemplateEngine,
  pub cookie_key: Key,
}

impl FromRef<AppState> for Key {
  fn from_ref(state: &AppState) -> Self {
    state.cookie_key.clone()
  }
}

pub(crate) async fn run(config: AppConfig) -> Result<()> {
  let mysql_pool = MySqlPoolOptions::new()
    .max_connections(8)
    .connect(&config.mysql.database_url())
    .await
    .context("failed to build mysql pool for api")?;

  let templates = TemplateEngine::new(api_template_root())?;

  let redis_manager = RedisConnectionManager::new(config.redis_uri.as_str())
    .context("failed to create redis manager for api")?;
  let redis_pool = Pool::builder()
    .max_size(16)
    .build(redis_manager)
    .await
    .context("failed to build redis pool for api")?;

  let state = AppState {
    config: config.clone(),
    mysql_pool,
    redis_pool,
    templates,
    cookie_key: oauth::cookie_signing_key(&config.cookie_secret_token),
  };

  let app = build_router(state);

  let bind_addr = format!("{}:{}", config.server.host, config.server.port);
  let listener = tokio::net::TcpListener::bind(&bind_addr)
    .await
    .with_context(|| format!("failed to bind api server on {bind_addr}"))?;

  info!("api server listening on {}", bind_addr);

  axum::serve(listener, app)
    .await
    .context("api server exited with error")
}

fn build_router(state: AppState) -> Router {
  Router::new()
    .route("/openapi.json", get(openapi_json))
    .route("/oauth/health", get(oauth_health))
    .route(
      "/oauth/authorize",
      get(oauth::authorize_get).post(oauth::authorize_post),
    )
    .route("/oauth/access_token", post(oauth::access_token_post))
    .with_state(state.clone())
    .layer(middleware::from_fn_with_state(state, auth::auth_middleware))
}

pub(crate) fn openapi_json_value() -> serde_json::Value {
  serde_json::to_value(ApiDoc::openapi()).unwrap_or_else(|_| serde_json::json!({}))
}

pub(crate) fn openapi_json_pretty() -> Result<String> {
  serde_json::to_string_pretty(&ApiDoc::openapi())
    .context("failed to serialize OpenAPI doc to pretty JSON")
}

#[derive(Debug, Serialize, ToSchema)]
struct HealthResponse {
  ok: bool,
  login: bool,
  user_id: i64,
}

#[derive(OpenApi)]
#[openapi(
  paths(openapi_json, oauth_health),
  components(schemas(AuthContext, HealthResponse)),
  tags((name = "oauth", description = "OAuth migration foundation routes"))
)]
struct ApiDoc;

#[utoipa::path(
  get,
  path = "/oauth/health",
  tag = "oauth",
  responses(
    (status = 200, description = "OAuth foundation health endpoint", body = HealthResponse)
  )
)]
async fn oauth_health(Extension(auth): Extension<AuthContext>) -> impl IntoResponse {
  Json(HealthResponse {
    ok: true,
    login: auth.login,
    user_id: auth.user_id,
  })
}

#[utoipa::path(
  get,
  path = "/openapi.json",
  tag = "oauth",
  responses(
    (status = 200, description = "Generated OpenAPI document", body = serde_json::Value)
  )
)]
async fn openapi_json() -> impl IntoResponse {
  Json(openapi_json_value())
}

fn api_template_root() -> PathBuf {
  PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("templates")
}

#[cfg(test)]
pub(crate) fn build_test_state() -> AppState {
  let config =
    AppConfig::load().expect("test config should load from env/file defaults");
  let mysql_pool = MySqlPoolOptions::new()
    .connect_lazy(&config.mysql.database_url())
    .expect("mysql url should be valid for lazy pool");
  let redis_manager = RedisConnectionManager::new(config.redis_uri.as_str())
    .expect("redis url should be valid for lazy pool manager");
  let redis_pool = Pool::builder().build_unchecked(redis_manager);
  let templates = TemplateEngine::new(api_template_root())
    .expect("template engine should load test templates");

  AppState {
    config,
    mysql_pool,
    redis_pool,
    templates,
    cookie_key: oauth::cookie_signing_key("test-cookie-signing-key"),
  }
}

#[cfg(test)]
pub(crate) fn build_test_router() -> Router {
  build_router(build_test_state())
}

#[cfg(test)]
mod tests {
  use axum::body::{to_bytes, Body};
  use axum::http::{Request, StatusCode};
  use serde_json::Value;
  use tower::util::ServiceExt;

  use super::build_test_router;

  #[tokio::test]
  async fn openapi_route_returns_document() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .uri("/openapi.json")
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("openapi route should respond");

    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value =
      serde_json::from_slice(&body).expect("openapi json should parse");

    assert_eq!(parsed["openapi"], "3.1.0");
    assert!(parsed["paths"].get("/openapi.json").is_some());
    assert!(parsed["paths"].get("/oauth/health").is_some());
  }

  #[tokio::test]
  async fn oauth_health_route_returns_anonymous_status() {
    let app = build_test_router();

    let response = app
      .oneshot(
        Request::builder()
          .uri("/oauth/health")
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("health route should respond");

    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value =
      serde_json::from_slice(&body).expect("health json should parse");

    assert_eq!(parsed["ok"], true);
    assert_eq!(parsed["login"], false);
    assert_eq!(parsed["user_id"], 0);
  }
}
