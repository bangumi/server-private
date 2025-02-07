import { KafkaJS } from '@confluentinc/kafka-javascript';

import { handle as handleBlogEvent } from '@app/event/blog';
import { handle as handleCharacterEvent } from '@app/event/character';
import { handle as handleGroupEvent } from '@app/event/group';
import { handle as handleIndexEvent } from '@app/event/index';
import { handle as handlePersonEvent } from '@app/event/person';
import {
  handle as handleSubjectEvent,
  handleEpisode as handleEpisodeEvent,
  handleFields as handleSubjectFieldsEvent,
} from '@app/event/subject';
import { handle as handleTimelineEvent } from '@app/event/timeline';
import type { Payload } from '@app/event/type';
import { handle as handleUserEvent } from '@app/event/user';
import config from '@app/lib/config.ts';
import { logger } from '@app/lib/logger';

const TOPICS = [
  // 'debezium.chii.bangumi.chii_pms',
  // 'debezium.chii.bangumi.chii_subject_revisions',
  'debezium.chii.bangumi.chii_blog_entry',
  'debezium.chii.bangumi.chii_characters',
  'debezium.chii.bangumi.chii_episodes',
  'debezium.chii.bangumi.chii_groups',
  'debezium.chii.bangumi.chii_index',
  'debezium.chii.bangumi.chii_members',
  'debezium.chii.bangumi.chii_persons',
  'debezium.chii.bangumi.chii_subject_fields',
  'debezium.chii.bangumi.chii_subjects',
  'debezium.chii.bangumi.chii_timeline',
];

async function onMessage(key: string, value: string) {
  const payload = JSON.parse(value) as Payload;
  switch (payload.source.table) {
    case 'chii_blog_entry': {
      await handleBlogEvent(key, value);
      break;
    }
    case 'chii_characters': {
      await handleCharacterEvent(key, value);
      break;
    }
    case 'chii_episodes': {
      await handleEpisodeEvent(key, value);
      break;
    }
    case 'chii_groups': {
      await handleGroupEvent(key, value);
      break;
    }
    case 'chii_index': {
      await handleIndexEvent(key, value);
      break;
    }
    case 'chii_members': {
      await handleUserEvent(key, value);
      break;
    }
    case 'chii_persons': {
      await handlePersonEvent(key, value);
      break;
    }
    case 'chii_subject_fields': {
      await handleSubjectFieldsEvent(key, value);
      break;
    }
    case 'chii_subjects': {
      await handleSubjectEvent(key, value);
      break;
    }
    case 'chii_timeline': {
      await handleTimelineEvent(key, value);
      break;
    }
    default: {
      break;
    }
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log("hello from mq");
    return
  }

  if (!config.kafkaBrokers) {
    logger.error('KAFKA_BROKERS is not set');
    return;
  }
  const { Kafka, logLevel } = KafkaJS;

  const kafka = new Kafka({
    log_level: logLevel.WARN,
    'client.id': 'server-private',
  });
  const consumer = kafka.consumer({
    'bootstrap.servers': config.kafkaBrokers,
    'group.id': 'server-private',
  });
  await consumer.connect();
  await consumer.subscribe({ topics: TOPICS });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.key) {
        return;
      }
      if (!message.value) {
        return;
      }
      try {
        await onMessage(message.key.toString(), message.value.toString());
      } catch (error) {
        logger.error(`Error processing message ${message.key.toString()}: ${error}`);
      }
    },
  });
}

await main();
