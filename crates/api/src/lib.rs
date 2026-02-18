use anyhow::Result;
use spdlog::info;

pub async fn server_placeholder() -> Result<()> {
  info!("server placeholder ready; next step is to migrate path-split http entrypoint");
  Ok(())
}
