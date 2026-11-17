import { setTimeout as sleep } from 'node:timers/promises';

import type { KafkaConsumer, Message } from '@confluentinc/kafka-javascript';

import { handle as handleBlogEvent } from '@app/event/blog';
import { handle as handleCharacterEvent } from '@app/event/character';
import {
  handle as handleGroupEvent,
  handleMember as handleGroupMemberEvent,
  handleTopic as handleGroupTopicEvent,
} from '@app/event/group';
import { handle as handleIndexEvent } from '@app/event/index';
import { handle as handleLikeEvent } from '@app/event/like';
import { handle as handleNotifyEvent } from '@app/event/notify';
import { handle as handlePersonEvent } from '@app/event/person';
import {
  handle as handleSubjectEvent,
  handleEpisode as handleEpisodeEvent,
  handleFields as handleSubjectFieldsEvent,
  handleSubjectDate,
  handleTopic as handleSubjectTopicEvent,
} from '@app/event/subject';
import { handle as handleTimelineEvent } from '@app/event/timeline';
import type { KafkaMessage, Payload } from '@app/event/type';
import {
  handle as handleUserEvent,
  handleFields as handleUserFieldsEvent,
  handleFriend as handleFriendEvent,
} from '@app/event/user';
import { newConsumer } from '@app/lib/kafka.ts';
import { logger } from '@app/lib/logger';
import { handleTimelineMessage } from '@app/lib/timeline/kafka.ts';

const TOPICS = [
  'timeline',
  'notify.v1',

  // 'debezium.chii.bangumi.chii_pms',
  // 'debezium.chii.bangumi.chii_subject_revisions',
  'debezium.chii.bangumi.chii_blog_entry',
  'debezium.chii.bangumi.chii_characters',
  'debezium.chii.bangumi.chii_episodes',
  'debezium.chii.bangumi.chii_groups',
  'debezium.chii.bangumi.chii_group_members',
  'debezium.chii.bangumi.chii_group_topics',
  'debezium.chii.bangumi.chii_index',
  'debezium.chii.bangumi.chii_likes',
  'debezium.chii.bangumi.chii_memberfields',
  'debezium.chii.bangumi.chii_members',
  'debezium.chii.bangumi.chii_friends',
  'debezium.chii.bangumi.chii_persons',
  'debezium.chii.bangumi.chii_subject_fields',
  'debezium.chii.bangumi.chii_subject_topics',
  'debezium.chii.bangumi.chii_subjects',
  'debezium.chii.bangumi.chii_timeline',
  'debezium.chii.bangumi.chii_subject_revisions',
];

type Handler = (msg: KafkaMessage) => Promise<void>;

const binlogHandlers: Record<string, Handler | Handler[]> = {
  chii_blog_entry: handleBlogEvent,
  chii_characters: handleCharacterEvent,
  chii_episodes: handleEpisodeEvent,
  chii_groups: handleGroupEvent,
  chii_group_members: handleGroupMemberEvent,
  chii_group_topics: handleGroupTopicEvent,
  chii_index: handleIndexEvent,
  chii_likes: handleLikeEvent,
  chii_memberfields: handleUserFieldsEvent,
  chii_members: handleUserEvent,
  chii_friends: handleFriendEvent,
  chii_persons: handlePersonEvent,
  chii_subject_fields: handleSubjectFieldsEvent,
  chii_subject_topics: handleSubjectTopicEvent,
  chii_subjects: [handleSubjectEvent, handleSubjectDate],
  chii_timeline: handleTimelineEvent,
  chii_subject_revisions: handleSubjectDate,
};

async function onBinlogMessage(msg: KafkaMessage) {
  const payload = JSON.parse(msg.value.toString()) as Payload;
  const handler = binlogHandlers[payload.source.table];
  if (!handler) {
    return;
  }
  if (Array.isArray(handler)) {
    // catch on each handler to it doesn't get swallowed by Promise.all.
    const ts = Array.from(handler, (h) =>
      h(msg).catch((error) => {
        logger.error('failed to handle event from %s: %o', payload.source.table, error as object);
      }),
    );
    await Promise.all(ts);
  } else {
    await handler(msg).catch((error) => {
      logger.error('failed to handle event from %s: %o', payload.source.table, error as object);
    });
  }
}

const serviceHandlers: Record<string, Handler> = {
  timeline: handleTimelineMessage,
  'notify.v1': handleNotifyEvent,
};

async function onServiceMessage(msg: KafkaMessage) {
  const handler = serviceHandlers[msg.topic];
  if (!handler) {
    return;
  }
  await handler(msg).catch((error) => {
    logger.error('failed to handle event from %s: %o', msg.topic, error as object);
  });
}

/** 每批处理的数量，取小一点让 poll 更频繁，避免处理慢时超过 max.poll.interval.ms 被踢出消费组 */
const POLL_SIZE = 10;

/** 单条消息处理超过这个时间就视为卡死，退出进程交给外部重启；取值要大于粉丝数上千的用户扇出的正常耗时 */
const MESSAGE_TIMEOUT_MS = 5 * 60_000;

const HEARTBEAT_INTERVAL_MS = 5 * 60_000;

async function handleMessage(msg: Message) {
  if (!msg.value) {
    return;
  }
  try {
    if (msg.topic.startsWith('debezium.')) {
      if (!msg.key) {
        return;
      }
      await onBinlogMessage({
        topic: msg.topic,
        key: msg.key.toString(),
        value: msg.value,
      });
    } else {
      const key = msg.key?.toString() ?? '';
      logger.info(`processing message ${msg.topic} ${msg.offset} ${key}`);

      await onServiceMessage({
        topic: msg.topic,
        key,
        value: msg.value,
      });
    }
  } catch (error) {
    logger.error(
      error,
      `error processing message ${msg.topic} ${msg.offset} ${msg.key?.toString() ?? ''}`,
    );
  }
}

function poll(consumer: KafkaConsumer): Promise<Message[]> {
  return new Promise((resolve, reject) => {
    consumer.consume(POLL_SIZE, (error, messages) => {
      if (error) {
        reject(new Error(`kafka consume failed: ${error.message}`, { cause: error }));
      } else {
        resolve(messages);
      }
    });
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`processing took longer than ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function main() {
  if (process.argv.includes('--help')) {
    //eslint-disable-next-line no-console
    console.log("mq doesn't have help message");
    return;
  }

  const consumer = await newConsumer(TOPICS);

  let processed = 0;
  let lastHeartbeatAt = Date.now();

  for (;;) {
    let messages: Message[];
    try {
      messages = await poll(consumer);
    } catch (error) {
      logger.error(error, 'failed to poll messages, retrying');
      await sleep(1000);
      continue;
    }

    for (const msg of messages) {
      try {
        await withTimeout(handleMessage(msg), MESSAGE_TIMEOUT_MS);
      } catch (error) {
        // offset 还没有 store，退出后重启会重新消费这条消息
        logger.error(
          error,
          `failed to process message ${msg.topic} ${msg.partition} ${msg.offset}`,
        );
        throw error;
      }

      consumer.offsetsStore([
        { topic: msg.topic, partition: msg.partition, offset: msg.offset + 1 },
      ]);
      processed += 1;
    }

    const now = Date.now();
    if (now - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) {
      continue;
    }

    logger.info(
      `mq heartbeat: processed ${processed} messages in the last ${Math.round((now - lastHeartbeatAt) / 1000)}s`,
    );
    processed = 0;
    lastHeartbeatAt = now;
  }
}

await main();
