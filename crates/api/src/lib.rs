use anyhow::Result;
use bangumi_config::AppConfig;
use spdlog::info;

mod auth;
mod error;
mod oauth;
mod server;
mod template;

pub fn export_openapi_json() -> Result<String> {
  server::openapi_json_pretty()
}

pub async fn run_server(config: AppConfig) -> Result<()> {
  info!(
    "starting rust api server at {}:{}",
    config.server.host, config.server.port
  );
  server::run(config).await
}

pub async fn server_placeholder() -> Result<()> {
  info!("server placeholder ready; next step is to migrate path-split http entrypoint");
  Ok(())
}
