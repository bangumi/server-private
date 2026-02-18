#![allow(dead_code)]

use std::sync::OnceLock;

use anyhow::{Context, Result};
use bangumi_wiki_parser::{parse_omit_error, FieldValue};
use regex::Regex;
use sqlx::FromRow;
use tokio::time::{sleep, Duration};

use crate::context::MqContext;

#[derive(Debug, Deserialize)]
struct SubjectPlatformsRoot {
  defaults: std::collections::HashMap<String, SubjectPlatformDefault>,
  platforms: std::collections::HashMap<
    String,
    std::collections::HashMap<String, SubjectPlatform>,
  >,
}

#[derive(Debug, Deserialize)]
struct SubjectPlatformDefault {
  sort_keys: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SubjectPlatform {
  sort_keys: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DateParts {
  pub year: i32,
  pub month: i32,
  pub day: i32,
}

impl DateParts {
  fn to_db_string(self) -> String {
    if self.year <= 0 {
      return String::new();
    }
    if self.month <= 0 {
      return format!("{:04}", self.year);
    }
    if self.day <= 0 {
      return format!("{:04}-{:02}", self.year, self.month);
    }
    format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
  }
}

#[derive(Debug, FromRow)]
struct SubjectRow {
  infobox: String,
  type_id: i64,
  platform: i64,
}

pub async fn update_subject_date(
  ctx: &MqContext,
  subject_id: i64,
  ts_ms: Option<i64>,
) -> Result<()> {
  if let Some(ts_ms) = ts_ms {
    let now = chrono::Utc::now().timestamp_millis();
    if now <= ts_ms + 2000 {
      sleep(Duration::from_millis((ts_ms + 2000 - now) as u64)).await;
    }
  }

  let subject = sqlx::query_as::<_, SubjectRow>(
    r#"
      SELECT
        field_infobox AS infobox,
        subject_type_id AS type_id,
        subject_platform AS platform
      FROM chii_subjects
      WHERE subject_id = ?
      LIMIT 1
    "#,
  )
  .bind(subject_id)
  .fetch_optional(&ctx.mysql_pool)
  .await
  .context("failed to query subject for date updater")?;

  let Some(subject) = subject else {
    return Ok(());
  };

  let wiki = parse_omit_error(&subject.infobox);
  let date = extract_date_from_wiki(&wiki, subject.type_id, subject.platform);
  let Some(date) = date else {
    return Ok(());
  };
  if date.year <= 1900 {
    return Ok(());
  }

  sqlx::query(
    r#"
      UPDATE chii_subject_fields
      SET field_year = ?, field_mon = ?, field_date = ?
      WHERE field_sid = ?
    "#,
  )
  .bind(date.year)
  .bind(date.month)
  .bind(date.to_db_string())
  .bind(subject_id)
  .execute(&ctx.mysql_pool)
  .await
  .context("failed to update subject date fields")?;

  Ok(())
}

fn extract_date_from_wiki(
  wiki: &bangumi_wiki_parser::Wiki,
  type_id: i64,
  platform: i64,
) -> Option<DateParts> {
  let keys = subject_platform_sort_keys(type_id, platform);
  for key in keys {
    let Some(value) = wiki.field(&key) else {
      continue;
    };
    match value {
      FieldValue::Scalar(text) => {
        if let Some(date) = extract_from_string(text) {
          return Some(date);
        }
      }
      FieldValue::Array(items) => {
        for item in items {
          if let Some(date) = extract_from_string(&item.value) {
            return Some(date);
          }
        }
      }
      FieldValue::Null => {}
    }
  }
  None
}

fn extract_from_string(s: &str) -> Option<DateParts> {
  for pattern in patterns() {
    let Some(caps) = pattern.captures(s) else {
      continue;
    };

    let year = caps.name("year")?.as_str().parse::<i32>().ok()?;
    let month = caps
      .name("month")
      .and_then(|v| v.as_str().parse::<i32>().ok())
      .unwrap_or(0);
    let day = caps
      .name("day")
      .and_then(|v| v.as_str().parse::<i32>().ok())
      .unwrap_or(0);

    return Some(DateParts { year, month, day });
  }

  None
}

fn patterns() -> &'static [Regex] {
  static PATTERNS: OnceLock<Vec<Regex>> = OnceLock::new();
  PATTERNS.get_or_init(|| {
    vec![
      Regex::new(r"(?P<year>\d{4})-(?P<month>\d{1,2})-(?P<day>\d{1,2})")
        .expect("valid regex"),
      Regex::new(r"(?P<year>\d{4})/(?P<month>\d{1,2})/(?P<day>\d{1,2})")
        .expect("valid regex"),
      Regex::new(r"(?P<year>\d{4})\.(?P<month>\d{1,2})\.(?P<day>\d{1,2})")
        .expect("valid regex"),
      Regex::new(r"(?P<year>\d{4})年(?:(?P<month>\d{1,2})月)?(?:(?P<day>\d{1,2})日)?")
        .expect("valid regex"),
    ]
  })
}

fn subject_platform_sort_keys(type_id: i64, platform: i64) -> Vec<String> {
  let root = subject_platform_config();
  let type_key = type_id.to_string();
  let platform_key = platform.to_string();

  if let Some(keys) = root
    .platforms
    .get(&type_key)
    .and_then(|platforms| platforms.get(&platform_key))
    .and_then(|platform| platform.sort_keys.as_ref())
  {
    return keys.clone();
  }

  if let Some(defaults) = root.defaults.get(&type_key) {
    return defaults.sort_keys.clone();
  }

  vec![
    "放送开始".to_owned(),
    "发行日期".to_owned(),
    "开始".to_owned(),
  ]
}

fn subject_platform_config() -> &'static SubjectPlatformsRoot {
  static CONFIG: OnceLock<SubjectPlatformsRoot> = OnceLock::new();
  CONFIG.get_or_init(|| {
    serde_json::from_str::<SubjectPlatformsRoot>(include_str!(
      "../../../../vendor/common/subject_platforms.json"
    ))
    .expect("valid subject platform config")
  })
}

use serde::Deserialize;

#[cfg(test)]
mod tests {
  use super::*;

  fn assert_date(actual: Option<DateParts>, year: i32, month: i32, day: i32) {
    let date = actual.expect("date expected");
    assert_eq!(date.year, year);
    assert_eq!(date.month, month);
    assert_eq!(date.day, day);
  }

  #[test]
  fn extract_from_string_cases_from_js() {
    assert_eq!(extract_from_string(""), None);
    assert_date(extract_from_string("2020年1月3日"), 2020, 1, 3);
    assert_date(
      extract_from_string("2017-12-22(2018年1月5日・12日合併号)"),
      2017,
      12,
      22,
    );
    assert_date(extract_from_string("2025年"), 2025, 0, 0);
  }

  #[test]
  fn extract_date_from_scalar_field() {
    let wiki =
      parse_omit_error("{{Infobox\n|发售日= 2024-02-24（预售）\n|开始= 2021-04-16\n}}");
    assert_date(extract_date_from_wiki(&wiki, 1, 0), 2024, 2, 24);
  }

  #[test]
  fn extract_date_from_array_field() {
    let wiki = parse_omit_error("{{Infobox\n|发售日={\n[条目|2020年1月3日]\n}\n}}");
    assert_date(extract_date_from_wiki(&wiki, 1, 0), 2020, 1, 3);
  }

  #[test]
  fn extract_date_wiki_cases_from_js() {
    let wiki = parse_omit_error("{{Infobox}}");
    assert_eq!(extract_date_from_wiki(&wiki, 1, 0), None);

    let wiki = parse_omit_error("{{Infobox\n|上映年度=1887-07-01\n}}");
    assert_date(extract_date_from_wiki(&wiki, 2, 0), 1887, 7, 1);

    let wiki = parse_omit_error(
      "{{Infobox animanga/Novel\n|发售日= 2024-02-24（预售）\n|开始= 2021-04-16\n|结束= 2021-06-02\n}}",
    );
    assert_date(extract_date_from_wiki(&wiki, 1, 0), 2024, 2, 24);

    let wiki = parse_omit_error(
      "{{Infobox animanga/Novel\n|中文名= 弑子村\n|别名={\n[弒子村]\n}\n|出版社= 講談社\n|价格= ￥1,540\n|连载杂志=\n|发售日= 2019-11-28\n|册数=\n|页数= 248\n|话数=\n|ISBN= 4065170958\n|其他=\n|作者= 木原音瀬\n|插图= 中村明日美子\n}}",
    );
    assert_date(extract_date_from_wiki(&wiki, 1, 0), 2019, 11, 28);
  }
}
