use std::future;

use anyhow::{Context, Result};
use spdlog::{error, info};
use tokio_cron_scheduler::{Job, JobScheduler};

use crate::context::CronContext;
use crate::{heartbeat, oauth_cleanup, timeline_cache, trending};
use trending::TrendingPeriod;

#[derive(Clone, Copy)]
enum CronTask {
    Heartbeat,
    TrendingSubjects,
    TrendingSubjectTopics,
    TruncateGlobalCache,
    TruncateInboxCache,
    TruncateUserCache,
    CleanupExpiredAccessTokens,
    CleanupExpiredRefreshTokens,
}

#[derive(Clone, Copy)]
struct CronJobSpec {
    name: &'static str,
    cron_expr: &'static str,
    task: CronTask,
    enabled: bool,
}

pub(crate) async fn run_default_schedule(ctx: CronContext) -> Result<()> {
    let timezone = chrono_tz::Asia::Shanghai;

    info!(
        "starting default cron schedule with ts-compatible cron expressions, timezone={}",
        timezone
    );

    let scheduler = JobScheduler::new()
        .await
        .context("failed to create tokio cron scheduler")?;

    for spec in default_schedule_specs() {
        if !spec.enabled {
            info!(
                "cron job disabled in rust server, job={}, cron={}",
                spec.name,
                spec.cron_expr
            );
            continue;
        }

        let task = spec.task;
        let name = spec.name;
        let cron_expr = spec.cron_expr;
        let ctx = ctx.clone();

        let job = Job::new_async_tz(cron_expr, timezone, move |_id, _lock| {
            let ctx = ctx.clone();
            Box::pin(async move {
                if let Err(err) = run_task(&ctx, task).await {
                    error!("cron job execution failed, job={}, error={}", name, err);
                }
            })
        })
        .with_context(|| format!("invalid cron expr: {cron_expr}"))?;

        scheduler
            .add(job)
            .await
            .with_context(|| format!("failed to register cron job: {name}"))?;

        info!(
            "cron job registered, job={}, cron={}, timezone={}",
            name,
            cron_expr,
            timezone
        );
    }

    scheduler
        .start()
        .await
        .context("failed to start tokio cron scheduler")?;

    future::pending::<()>().await;
    Ok(())
}

fn default_schedule_specs() -> [CronJobSpec; 8] {
    [
        CronJobSpec {
            name: "heartbeat",
            cron_expr: "*/10 * * * * *",
            task: CronTask::Heartbeat,
            enabled: true,
        },
        CronJobSpec {
            name: "trendingSubjects",
            cron_expr: "0 0 3 * * *",
            task: CronTask::TrendingSubjects,
            enabled: true,
        },
        CronJobSpec {
            name: "trendingSubjectTopics",
            cron_expr: "0 */10 * * * *",
            task: CronTask::TrendingSubjectTopics,
            enabled: true,
        },
        CronJobSpec {
            name: "truncateTimelineGlobalCache",
            cron_expr: "*/10 * * * *",
            task: CronTask::TruncateGlobalCache,
            enabled: true,
        },
        CronJobSpec {
            name: "truncateTimelineInboxCache",
            cron_expr: "0 0 4 * * *",
            task: CronTask::TruncateInboxCache,
            enabled: true,
        },
        CronJobSpec {
            name: "truncateTimelineUserCache",
            cron_expr: "0 0 5 * * *",
            task: CronTask::TruncateUserCache,
            enabled: true,
        },
        CronJobSpec {
            name: "cleanupExpiredAccessTokens",
            cron_expr: "0 0 6 * * *",
            task: CronTask::CleanupExpiredAccessTokens,
            enabled: false,
        },
        CronJobSpec {
            name: "cleanupExpiredRefreshTokens",
            cron_expr: "0 0 7 * * *",
            task: CronTask::CleanupExpiredRefreshTokens,
            enabled: false,
        },
    ]
}

async fn run_task(ctx: &CronContext, task: CronTask) -> Result<()> {
    match task {
        CronTask::Heartbeat => heartbeat::run(ctx).await,
        CronTask::TrendingSubjects => trending::trending_subjects(ctx, TrendingPeriod::Month).await,
        CronTask::TrendingSubjectTopics => {
            trending::trending_subject_topics(ctx, TrendingPeriod::Week).await
        }
        CronTask::TruncateGlobalCache => timeline_cache::truncate_global(ctx).await,
        CronTask::TruncateInboxCache => timeline_cache::truncate_inbox(ctx).await,
        CronTask::TruncateUserCache => timeline_cache::truncate_user(ctx).await,
        CronTask::CleanupExpiredAccessTokens => oauth_cleanup::cleanup_expired_access_tokens(ctx).await,
        CronTask::CleanupExpiredRefreshTokens => oauth_cleanup::cleanup_expired_refresh_tokens(ctx).await,
    }
}
