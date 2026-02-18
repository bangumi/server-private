use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;

#[derive(Debug)]
pub(crate) struct AppError {
  pub status: StatusCode,
  pub message: String,
}

#[derive(Debug, Serialize)]
struct ErrorBody {
  error: &'static str,
  message: String,
  #[serde(rename = "statusCode")]
  status_code: u16,
}

impl AppError {
  pub fn bad_request(message: impl Into<String>) -> Self {
    Self {
      status: StatusCode::BAD_REQUEST,
      message: message.into(),
    }
  }

  pub fn unauthorized(message: impl Into<String>) -> Self {
    Self {
      status: StatusCode::UNAUTHORIZED,
      message: message.into(),
    }
  }

  pub fn internal(message: impl Into<String>) -> Self {
    Self {
      status: StatusCode::INTERNAL_SERVER_ERROR,
      message: message.into(),
    }
  }
}

impl IntoResponse for AppError {
  fn into_response(self) -> Response {
    let body = ErrorBody {
      error: self.status.canonical_reason().unwrap_or("Error"),
      message: self.message,
      status_code: self.status.as_u16(),
    };
    (self.status, Json(body)).into_response()
  }
}
