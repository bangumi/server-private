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

pub(crate) async fn trending_subjects(ctx: &CronContext, period: TrendingPeriod) -> Result<()> {
    info!("Updating trending subjects...");
    for subject_type in TRENDING_SUBJECT_TYPES {
        info!(
            "Updating trending subjects for subject_type={} period={}...",
            subject_type,
            period.as_str()
        );
        update_trending_subjects(ctx, subject_type, period).await?;
    }

    Ok(())
}

pub(crate) async fn trending_subject_topics(
    ctx: &CronContext,
    period: TrendingPeriod,
) -> Result<()> {
    info!("Updating trending subject topics...");

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
            "Already calculating trending subject topics for period={}...",
            period.as_str()
        );
        return Ok(());
    }

    redis::cmd("SET")
        .arg(&lock_key)
        .arg(1)
        .arg("EX")
        .arg(60)
        .query_async::<_, ()>(&mut *redis)
        .await
        .with_context(|| format!("failed to set redis lock key={lock_key}"))?;

    let min_dateline = period.min_dateline();
    info!(
        "Calculating trending subject topics for period={} from {} ...",
        period.as_str(),
        min_dateline
    );

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

    let items: Vec<TrendingItem> = rows
        .into_iter()
        .map(|row| TrendingItem {
            id: row.topic_id,
            total: row.total,
        })
        .collect();

    info!(
        "Trending subject topics calculated for period={} count={}",
        period.as_str(),
        items.len()
    );

    let payload =
        serde_json::to_string(&items).context("failed to serialize trending subject topics")?;
    redis
        .set::<_, _, ()>(&trending_key, payload)
        .await
        .with_context(|| format!("failed to write trending data key={trending_key}"))?;
    redis
        .del::<_, ()>(&lock_key)
        .await
        .with_context(|| format!("failed to delete redis lock key={lock_key}"))?;

    Ok(())
}

async fn update_trending_subjects(
    ctx: &CronContext,
    subject_type: i32,
    period: TrendingPeriod,
) -> Result<()> {
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
            "Already calculating trending subjects for subject_type={} period={}...",
            subject_type,
            period.as_str()
        );
        return Ok(());
    }

    redis::cmd("SET")
        .arg(&lock_key)
        .arg(1)
        .arg("EX")
        .arg(3600)
        .query_async::<_, ()>(&mut *redis)
        .await
        .with_context(|| format!("failed to set redis lock key={lock_key}"))?;

    let min_dateline = period.min_dateline();
    let doing_dateline = subject_type != 1 && subject_type != 3;

    info!(
        "Calculating trending subjects for subject_type={} period={} from {} ...",
        subject_type,
        period.as_str(),
        min_dateline
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

    let rows: Vec<SubjectTrendingRow> = sqlx::query_as(query)
        .bind(subject_type)
        .bind(min_dateline)
        .fetch_all(&ctx.mysql_pool)
        .await
        .context("failed to calculate trending subjects")?;

    let items: Vec<TrendingItem> = rows
        .into_iter()
        .map(|row| TrendingItem {
            id: row.subject_id,
            total: row.total,
        })
        .collect();

    info!(
        "Trending subjects calculated for subject_type={} period={} count={}",
        subject_type,
        period.as_str(),
        items.len()
    );

    let payload = serde_json::to_string(&items).context("failed to serialize trending subjects")?;
    redis
        .set::<_, _, ()>(&trending_key, payload)
        .await
        .with_context(|| format!("failed to write trending data key={trending_key}"))?;
    redis
        .del::<_, ()>(&lock_key)
        .await
        .with_context(|| format!("failed to delete redis lock key={lock_key}"))?;

    Ok(())
}
