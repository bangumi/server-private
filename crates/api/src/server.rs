use std::path::PathBuf;

use anyhow::{Context, Result};
use axum::extract::{Extension, State};
use axum::middleware;
use axum::response::{Html, IntoResponse};
use axum::routing::get;
use axum::{Json, Router};
use bangumi_config::AppConfig;
use serde::Serialize;
use spdlog::info;
use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;
use utoipa::{OpenApi, ToSchema};

use crate::auth::{self, AuthContext};
use crate::error::AppError;
use crate::template::TemplateEngine;

#[derive(Clone)]
pub(crate) struct AppState {
  pub config: AppConfig,
  pub mysql_pool: MySqlPool,
  pub templates: TemplateEngine,
}

pub(crate) async fn run(config: AppConfig) -> Result<()> {
  let mysql_pool = MySqlPoolOptions::new()
    .max_connections(8)
    .connect(&config.mysql.database_url())
    .await
    .context("failed to build mysql pool for api")?;

  let templates = TemplateEngine::new(api_template_root())?;

  let state = AppState {
    config: config.clone(),
    mysql_pool,
    templates,
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
    .route("/oauth/_placeholder", get(oauth_placeholder))
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

#[derive(Debug, Serialize)]
struct OauthTemplateView {
  login: bool,
  user_id: i64,
  title: &'static str,
  note: &'static str,
}

async fn oauth_placeholder(
  State(state): State<AppState>,
  Extension(auth): Extension<AuthContext>,
) -> Result<Html<String>, AppError> {
  let view = OauthTemplateView {
    login: auth.login,
    user_id: auth.user_id,
    title: "OAuth Migration Placeholder",
    note: "Rust template engine is ready for oauth/authorize migration.",
  };

  let html = state
    .templates
    .render("oauth/authorize.html", &view)
    .map_err(|error| AppError::internal(format!("failed to render oauth template: {error}")))?;

  Ok(Html(html))
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
mod tests {
  use axum::body::{to_bytes, Body};
  use axum::http::{Request, StatusCode};
  use bangumi_config::{AppConfig, MySqlConfig, ServerConfig};
  use serde_json::Value;
  use sqlx::mysql::MySqlPoolOptions;
  use tower::util::ServiceExt;

  use super::{build_router, api_template_root, AppState, TemplateEngine};

  fn test_config() -> AppConfig {
    AppConfig {
      server: ServerConfig {
        host: "127.0.0.1".to_owned(),
        port: 4000,
      },
      redis_uri: "redis://127.0.0.1:6379/0".to_owned(),
      kafka_brokers: "127.0.0.1:9092".to_owned(),
      mysql: MySqlConfig {
        host: "127.0.0.1".to_owned(),
        port: 3306,
        user: "user".to_owned(),
        password: "password".to_owned(),
        db: "bangumi".to_owned(),
      },
      cookie_secret_token: "insecure-cookie-secret-token-change-me-in-production".to_owned(),
      php_session_secret_key: "default-secret-key-not-safe-in-production".to_owned(),
    }
  }

  fn test_state() -> AppState {
    let config = test_config();
    let mysql_pool = MySqlPoolOptions::new()
      .connect_lazy(&config.mysql.database_url())
      .expect("mysql url should be valid for lazy pool");
    let templates =
      TemplateEngine::new(api_template_root()).expect("template engine should load test templates");

    AppState {
      config,
      mysql_pool,
      templates,
    }
  }

  #[tokio::test]
  async fn openapi_route_returns_document() {
    let app = build_router(test_state());

    let response = app
      .oneshot(Request::builder().uri("/openapi.json").body(Body::empty()).expect("request"))
      .await
      .expect("openapi route should respond");

    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let parsed: Value = serde_json::from_slice(&body).expect("openapi json should parse");

    assert_eq!(parsed["openapi"], "3.1.0");
    assert!(parsed["paths"].get("/openapi.json").is_some());
    assert!(parsed["paths"].get("/oauth/health").is_some());
  }

  #[tokio::test]
  async fn oauth_health_route_returns_anonymous_status() {
    let app = build_router(test_state());

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
    let parsed: Value = serde_json::from_slice(&body).expect("health json should parse");

    assert_eq!(parsed["ok"], true);
    assert_eq!(parsed["login"], false);
    assert_eq!(parsed["user_id"], 0);
  }

  #[tokio::test]
  async fn oauth_placeholder_route_renders_html() {
    let app = build_router(test_state());

    let response = app
      .oneshot(
        Request::builder()
          .uri("/oauth/_placeholder")
          .body(Body::empty())
          .expect("request"),
      )
      .await
      .expect("placeholder route should respond");

    assert_eq!(response.status(), StatusCode::OK);
    let body = to_bytes(response.into_body(), usize::MAX)
      .await
      .expect("response body should be readable");
    let html = String::from_utf8(body.to_vec()).expect("html should be utf8");

    assert!(html.contains("OAuth Migration Placeholder"));
    assert!(html.contains("login=false"));
  }
}
