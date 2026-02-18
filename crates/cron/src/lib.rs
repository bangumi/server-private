mod context;
mod heartbeat;
mod oauth_cleanup;
mod scheduler;
mod timeline_cache;
mod trending;

use anyhow::Result;
use bgm_config::AppConfig;
use context::CronContext;
use trending::TrendingPeriod;

pub async fn heartbeat_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    heartbeat::run(&ctx).await
}

pub async fn truncate_global_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    timeline_cache::truncate_global(&ctx).await
}

pub async fn truncate_inbox_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    timeline_cache::truncate_inbox(&ctx).await
}

pub async fn truncate_user_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    timeline_cache::truncate_user(&ctx).await
}

pub async fn trending_subjects_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    trending::trending_subjects(&ctx, TrendingPeriod::Month).await
}

pub async fn trending_subject_topics_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    trending::trending_subject_topics(&ctx, TrendingPeriod::Week).await
}

pub async fn cleanup_expired_access_tokens_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    oauth_cleanup::cleanup_expired_access_tokens(&ctx).await
}

pub async fn cleanup_expired_refresh_tokens_once(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    oauth_cleanup::cleanup_expired_refresh_tokens(&ctx).await
}

pub async fn run_default_schedule(config: &AppConfig) -> Result<()> {
    let ctx = CronContext::new(config).await?;
    scheduler::run_default_schedule(ctx).await
}
