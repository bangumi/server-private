import { Kafka, logLevel } from 'kafkajs';

import { handle as handleTimelineEvent } from '@app/event/timeline';
import type { Payload } from '@app/event/type';
import config from '@app/lib/config.ts';
import { logger } from '@app/lib/logger';

const TOPICS = [
  'debezium.bangumi.chii_characters',
  'debezium.bangumi.chii_members',
  'debezium.bangumi.chii_persons',
  'debezium.bangumi.chii_pms',
  'debezium.bangumi.chii_subject_fields',
  'debezium.bangumi.chii_subjects',
  'debezium.bangumi.chii_timeline',
];

async function onMessage(key: string, value: string) {
  const payload = JSON.parse(value.toString()) as Payload;
  switch (payload.source.table) {
    case 'chii_timeline': {
      await handleTimelineEvent(key, value);
      break;
    }
    default: {
      logger.debug('unhandled', payload);
      break;
    }
  }
}

async function main() {
  if (!config.kafkaBrokers) {
    logger.error('KAFKA_URI is not set');
    return;
  }
  const kafka = new Kafka({
    logLevel: logLevel.WARN,
    brokers: config.kafkaBrokers,
    clientId: 'server-private',
  });

  const consumer = kafka.consumer({ groupId: 'server-private' });
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
      await onMessage(message.key.toString(), message.value.toString());
    },
  });
}

await main();
