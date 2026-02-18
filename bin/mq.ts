import { handleSubjectDate } from '@app/event/subject';
import type { KafkaMessage, Payload } from '@app/event/type';
import { newConsumer } from '@app/lib/kafka.ts';
import { logger } from '@app/lib/logger';
import { handleTimelineMessage } from '@app/lib/timeline/kafka.ts';

const TOPICS = [
  'timeline',
  'debezium.chii.bangumi.chii_subjects',
  'debezium.chii.bangumi.chii_subject_revisions',
];

type Handler = (msg: KafkaMessage) => Promise<void>;

const binlogHandlers: Record<string, Handler | Handler[]> = {
  chii_subjects: handleSubjectDate,
  chii_subject_revisions: handleSubjectDate,
};

async function onBinlogMessage(msg: KafkaMessage) {
  const payload = JSON.parse(msg.value) as Payload;
  const handler = binlogHandlers[payload.source.table];
  if (!handler) {
    return;
  }
  if (Array.isArray(handler)) {
    const ts = [];
    for (const h of handler) {
      // catch on each handler to it doesn't get swallowed by Promise.all.
      ts.push(
        h(msg).catch((error) => {
          logger.error('failed to handle event from %s: %o', payload.source.table, error as object);
        }),
      );
    }
    await Promise.all(ts);
  } else {
    await handler(msg).catch((error) => {
      logger.error('failed to handle event from %s: %o', payload.source.table, error as object);
    });
  }
}

const serviceHandlers: Record<string, Handler> = {
  timeline: handleTimelineMessage,
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

async function main() {
  if (process.argv.includes('--help')) {
    //eslint-disable-next-line no-console
    console.log("mq doesn't have help message");
    return;
  }

  const consumer = await newConsumer(TOPICS);
  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.key) {
        return;
      }
      if (!message.value) {
        return;
      }
      try {
        if (topic.startsWith('debezium.')) {
          await onBinlogMessage({
            topic: topic,
            key: message.key.toString(),
            value: message.value.toString(),
          });
        } else {
          await onServiceMessage({
            topic: topic,
            key: message.key.toString(),
            value: message.value.toString(),
          });
        }
      } catch (error) {
        logger.error(error, `error processing message ${message.key.toString()}`);
      }
    },
  });
}

await main();
