use std::env;
use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct AppConfig {
  pub server: ServerConfig,
  pub redis_uri: String,
  pub kafka_brokers: String,
  pub kafka_rust_mq_group_id: String,
  pub mysql: MySqlConfig,
  pub cookie_secret_token: String,
  pub php_session_secret_key: String,
}

#[derive(Debug, Clone)]
pub struct ServerConfig {
  pub host: String,
  pub port: u16,
}

#[derive(Debug, Clone)]
pub struct MySqlConfig {
  pub host: String,
  pub port: u16,
  pub user: String,
  pub password: String,
  pub db: String,
}

impl MySqlConfig {
  pub fn database_url(&self) -> String {
    format!(
      "mysql://{}:{}@{}:{}/{}?ssl-mode=DISABLED",
      self.user, self.password, self.host, self.port, self.db
    )
  }
}

#[derive(Debug, Clone, Deserialize, Default)]
struct FileConfig {
  server: Option<FileServerConfig>,
  #[serde(rename = "redisUri")]
  redis_uri: Option<String>,
  #[serde(rename = "kafkaBrokers")]
  kafka_brokers: Option<String>,
  #[serde(rename = "kafkaRustMqGroupId")]
  kafka_rust_mq_group_id: Option<String>,
  mysql: Option<FileMySqlConfig>,
  cookie_secret_token: Option<String>,
  php_session_secret_key: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
struct FileServerConfig {
  host: Option<String>,
  port: Option<u16>,
}

#[derive(Debug, Clone, Deserialize, Default)]
struct FileMySqlConfig {
  host: Option<String>,
  port: Option<u16>,
  user: Option<String>,
  password: Option<String>,
  db: Option<String>,
}

impl AppConfig {
  pub fn load() -> Result<Self> {
    let file_path = config_path();
    let file_config = read_file_config(&file_path)?;

    let server_from_file = file_config.server.clone().unwrap_or_default();
    let server = ServerConfig {
      host: env_var("HOST")
        .or(server_from_file.host)
        .unwrap_or_else(|| "0.0.0.0".to_owned()),
      port: env_var("PORT")
        .and_then(|value| value.parse::<u16>().ok())
        .or(server_from_file.port)
        .unwrap_or(4000),
    };

    let redis_uri = env_var("REDIS_URI")
      .or(file_config.redis_uri.clone())
      .unwrap_or_else(|| "redis://127.0.0.1:3306/0".to_owned());

    let kafka_brokers = env_var("KAFKA_BROKERS")
      .or(file_config.kafka_brokers.clone())
      .unwrap_or_else(|| "127.0.0.1:9092".to_owned());

    let kafka_rust_mq_group_id = env_var("KAFKA_RUST_MQ_GROUP_ID")
      .or(file_config.kafka_rust_mq_group_id.clone())
      .unwrap_or_else(|| "server-private-rust-mq".to_owned());

    let mysql_from_file = file_config.mysql.clone().unwrap_or_default();
    let mysql = MySqlConfig {
      host: env_var("MYSQL_HOST")
        .or(mysql_from_file.host)
        .unwrap_or_else(|| "127.0.0.1".to_owned()),
      port: env_var("MYSQL_PORT")
        .and_then(|value| value.parse::<u16>().ok())
        .or(mysql_from_file.port)
        .unwrap_or(3306),
      user: env_var("MYSQL_USER")
        .or(mysql_from_file.user)
        .unwrap_or_else(|| "user".to_owned()),
      password: env_var("MYSQL_PASS")
        .or(mysql_from_file.password)
        .unwrap_or_else(|| "password".to_owned()),
      db: env_var("MYSQL_DB")
        .or(mysql_from_file.db)
        .unwrap_or_else(|| "bangumi".to_owned()),
    };

    let cookie_secret_token = env_var("COOKIE_SECRET_TOKEN")
      .or(file_config.cookie_secret_token)
      .unwrap_or_else(|| {
        "insecure-cookie-secret-token-change-me-in-production".to_owned()
      });

    let php_session_secret_key = env_var("PHP_SESSION_SECRET_KEY")
      .or(file_config.php_session_secret_key)
      .unwrap_or_else(|| "default-secret-key-not-safe-in-production".to_owned());

    Ok(Self {
      server,
      redis_uri,
      kafka_brokers,
      kafka_rust_mq_group_id,
      mysql,
      cookie_secret_token,
      php_session_secret_key,
    })
  }
}

fn env_var(key: &str) -> Option<String> {
  env::var(key).ok().filter(|value| !value.trim().is_empty())
}

fn config_path() -> PathBuf {
  if let Ok(path) = env::var("CHII_CONFIG_FILE") {
    let trimmed = path.trim();
    if !trimmed.is_empty() {
      return PathBuf::from(trimmed);
    }
  }

  PathBuf::from("config.yaml")
}

fn read_file_config(path: &PathBuf) -> Result<FileConfig> {
  if !path.exists() {
    return Ok(FileConfig::default());
  }

  let content = fs::read_to_string(path)
    .with_context(|| format!("failed to read config file: {}", path.display()))?;

  let parsed: FileConfig =
    yaml_serde::from_str(&content).context("failed to parse yaml config file")?;

  Ok(parsed)
}

#[cfg(test)]
mod tests {
  use super::MySqlConfig;

  #[test]
  fn mysql_database_url_disables_ssl_by_default() {
    let config = MySqlConfig {
      host: "127.0.0.1".to_owned(),
      port: 3306,
      user: "user".to_owned(),
      password: "password".to_owned(),
      db: "bangumi".to_owned(),
    };

    assert_eq!(
      config.database_url(),
      "mysql://user:password@127.0.0.1:3306/bangumi?ssl-mode=DISABLED"
    );
  }
}
