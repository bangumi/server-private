import ZstdCodec from '@kafkajs/zstd';
import { CompressionTypes, Kafka, logLevel } from 'kafkajs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import KafkaJS from 'kafkajs';

import { handle as handleTimelineEvent } from '@app/event/timeline';
import type { Payload } from '@app/event/type';
import config from '@app/lib/config.ts';
import { logger } from '@app/lib/logger';

const TOPICS = [
  // 'debezium.chii.bangumi.chii_characters',
  // 'debezium.chii.bangumi.chii_members',
  // 'debezium.chii.bangumi.chii_persons',
  // 'debezium.chii.bangumi.chii_pms',
  // 'debezium.chii.bangumi.chii_subject_fields',
  // 'debezium.chii.bangumi.chii_subjects',
  'debezium.chii.bangumi.chii_timeline',
];

async function onMessage(key: string, value: string) {
  const payload = JSON.parse(value) as Payload;
  switch (payload.source.table) {
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
  if (!config.kafkaBrokers) {
    logger.error('KAFKA_URI is not set');
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  KafkaJS.CompressionCodecs[CompressionTypes.ZSTD] = ZstdCodec();

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
