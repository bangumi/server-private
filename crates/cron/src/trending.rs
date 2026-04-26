use anyhow::{Context, Result};
use bb8_redis::redis::{self, AsyncCommands};
use serde::Serialize;
use spdlog::info;

use crate::context::CronContext;

const TRENDING_SUBJECT_TYPES: [i32; 5] = [1, 2, 3, 4, 6];

#[derive(Clone, Copy)]
pub(crate) enum TrendingPeriod {
  Week,
  Month,
}

impl TrendingPeriod {
  pub(crate) fn as_str(self) -> &'static str {
    match self {
      TrendingPeriod::Week => "week",
      TrendingPeriod::Month => "month",
    }
  }

  fn min_dateline(self) -> i64 {
    let now = chrono::Utc::now().timestamp();
    match self {
      TrendingPeriod::Week => now - 86400 * 7,
      TrendingPeriod::Month => now - 86400 * 30,
    }
  }
}

#[derive(Serialize)]
struct TrendingItem {
  id: i64,
  total: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct SubjectTrendingRow {
  subject_id: i64,
  total: i64,
}

#[derive(Debug, sqlx::FromRow)]
struct TopicTrendingRow {
  topic_id: i64,
  total: i64,
}

pub(crate) async fn trending_subjects(
  ctx: &CronContext,
  period: TrendingPeriod,
) -> Result<()> {
  let start = std::time::Instant::now();
  info!(
    "trending subjects: starting, period={}, types={:?}",
    period.as_str(),
    TRENDING_SUBJECT_TYPES
  );
  for subject_type in TRENDING_SUBJECT_TYPES {
    update_trending_subjects(ctx, subject_type, period).await?;
  }

  info!(
    "trending subjects: all types done, period={}, elapsed={:?}",
    period.as_str(),
    start.elapsed()
  );
  Ok(())
}

pub(crate) async fn trending_subject_topics(
  ctx: &CronContext,
  period: TrendingPeriod,
) -> Result<()> {
  let start = std::time::Instant::now();
  info!(
    "trending subject topics: starting, period={}",
    period.as_str()
  );

  let trending_key = format!("trending:topics:subjects:{}", period.as_str());
  let lock_key = format!("lock:{}", trending_key);

  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;

  let lock_exists: Option<String> = redis
    .get(&lock_key)
    .await
    .with_context(|| format!("failed to read redis lock key={lock_key}"))?;
  if lock_exists.is_some() {
    info!(
      "trending subject topics: skipped, lock held, period={}, lock_key={}",
      period.as_str(),
      lock_key
    );
    return Ok(());
  }

  redis::cmd("SET")
    .arg(&lock_key)
    .arg(1)
    .arg("EX")
    .arg(60)
    .query_async::<()>(&mut *redis)
    .await
    .with_context(|| format!("failed to set redis lock key={lock_key}"))?;

  let min_dateline = period.min_dateline();
  info!(
    "trending subject topics: querying, period={}, min_dateline={}, lock_key={}",
    period.as_str(),
    min_dateline,
    lock_key
  );

  let query_start = std::time::Instant::now();
  let rows: Vec<TopicTrendingRow> = sqlx::query_as(
    "
        SELECT sbj_pst_mid AS topic_id, COUNT(sbj_pst_id) AS total
        FROM chii_subject_posts
        WHERE sbj_pst_dateline >= ?
        GROUP BY sbj_pst_mid
        ORDER BY total DESC
        LIMIT 100
        ",
  )
  .bind(min_dateline)
  .fetch_all(&ctx.mysql_pool)
  .await
  .context("failed to calculate trending subject topics")?;

  info!(
    "trending subject topics: query done, period={}, rows={}, query_elapsed={:?}",
    period.as_str(),
    rows.len(),
    query_start.elapsed()
  );

  let items: Vec<TrendingItem> = rows
    .into_iter()
    .map(|row| TrendingItem {
      id: row.topic_id,
      total: row.total,
    })
    .collect();

  if !items.is_empty() {
    let top = &items[..items.len().min(5)];
    info!(
      "trending subject topics: top results, period={}, top={:?}",
      period.as_str(),
      top
        .iter()
        .map(|i| format!("id={},total={}", i.id, i.total))
        .collect::<Vec<_>>()
    );
  }

  let payload = serde_json::to_string(&items)
    .context("failed to serialize trending subject topics")?;
  info!(
    "trending subject topics: writing to redis, key={}, payload_len={}",
    trending_key,
    payload.len()
  );
  redis
    .set::<_, _, ()>(&trending_key, &payload)
    .await
    .with_context(|| format!("failed to write trending data key={trending_key}"))?;
  redis
    .del::<_, ()>(&lock_key)
    .await
    .with_context(|| format!("failed to delete redis lock key={lock_key}"))?;

  info!(
    "trending subject topics: done, period={}, count={}, elapsed={:?}",
    period.as_str(),
    items.len(),
    start.elapsed()
  );
  Ok(())
}

async fn update_trending_subjects(
  ctx: &CronContext,
  subject_type: i32,
  period: TrendingPeriod,
) -> Result<()> {
  let start = std::time::Instant::now();
  let trending_key = format!("trending:subjects:{}:{}", subject_type, period.as_str());
  let lock_key = format!("lock:{}", trending_key);

  let mut redis = ctx
    .redis_pool
    .get()
    .await
    .context("failed to get redis connection from pool")?;

  let lock_exists: Option<String> = redis
    .get(&lock_key)
    .await
    .with_context(|| format!("failed to read redis lock key={lock_key}"))?;
  if lock_exists.is_some() {
    info!(
      "trending subjects: skipped, lock held, type={}, period={}, lock_key={}",
      subject_type,
      period.as_str(),
      lock_key
    );
    return Ok(());
  }

  redis::cmd("SET")
    .arg(&lock_key)
    .arg(1)
    .arg("EX")
    .arg(3600)
    .query_async::<()>(&mut *redis)
    .await
    .with_context(|| format!("failed to set redis lock key={lock_key}"))?;

  let min_dateline = period.min_dateline();
  let doing_dateline = subject_type != 1 && subject_type != 3;

  info!(
    "trending subjects: querying, type={}, period={}, min_dateline={}, doing_dateline={}",
    subject_type,
    period.as_str(),
    min_dateline,
    doing_dateline
  );

  let query = if doing_dateline {
    "
        SELECT s.subject_id AS subject_id, COUNT(s.subject_id) AS total
        FROM chii_subject_interests si
        INNER JOIN chii_subjects s ON s.subject_id = si.interest_subject_id
        WHERE s.subject_type_id = ?
          AND s.subject_ban <> 1
          AND si.interest_doing_dateline > ?
        GROUP BY s.subject_id
        ORDER BY total DESC
        LIMIT 1000
        "
  } else {
    "
        SELECT s.subject_id AS subject_id, COUNT(s.subject_id) AS total
        FROM chii_subject_interests si
        INNER JOIN chii_subjects s ON s.subject_id = si.interest_subject_id
        WHERE s.subject_type_id = ?
          AND s.subject_ban <> 1
          AND si.interest_lasttouch > ?
        GROUP BY s.subject_id
        ORDER BY total DESC
        LIMIT 1000
        "
  };

  let query_start = std::time::Instant::now();
  let rows: Vec<SubjectTrendingRow> = sqlx::query_as(query)
    .bind(subject_type)
    .bind(min_dateline)
    .fetch_all(&ctx.mysql_pool)
    .await
    .context("failed to calculate trending subjects")?;

  info!(
    "trending subjects: query done, type={}, period={}, rows={}, query_elapsed={:?}",
    subject_type,
    period.as_str(),
    rows.len(),
    query_start.elapsed()
  );

  let items: Vec<TrendingItem> = rows
    .into_iter()
    .map(|row| TrendingItem {
      id: row.subject_id,
      total: row.total,
    })
    .collect();

  if !items.is_empty() {
    let top = &items[..items.len().min(5)];
    info!(
      "trending subjects: top results, type={}, period={}, top={:?}",
      subject_type,
      period.as_str(),
      top
        .iter()
        .map(|i| format!("id={},total={}", i.id, i.total))
        .collect::<Vec<_>>()
    );
  }

  let payload =
    serde_json::to_string(&items).context("failed to serialize trending subjects")?;
  info!(
    "trending subjects: writing to redis, key={}, payload_len={}",
    trending_key,
    payload.len()
  );
  redis
    .set::<_, _, ()>(&trending_key, &payload)
    .await
    .with_context(|| format!("failed to write trending data key={trending_key}"))?;
  redis
    .del::<_, ()>(&lock_key)
    .await
    .with_context(|| format!("failed to delete redis lock key={lock_key}"))?;

  info!(
    "trending subjects: done, type={}, period={}, count={}, elapsed={:?}",
    subject_type,
    period.as_str(),
    items.len(),
    start.elapsed()
  );
  Ok(())
}
