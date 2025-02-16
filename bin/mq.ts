import { handle as handleBlogEvent } from '@app/event/blog';
import { handle as handleCharacterEvent } from '@app/event/character';
import {
  handle as handleGroupEvent,
  handleMember as handleGroupMemberEvent,
} from '@app/event/group';
import { handle as handleIndexEvent } from '@app/event/index';
import { handle as handlePersonEvent } from '@app/event/person';
import {
  handle as handleSubjectEvent,
  handleEpisode as handleEpisodeEvent,
  handleFields as handleSubjectFieldsEvent,
  handleTopic as handleSubjectTopicEvent,
} from '@app/event/subject';
import { handle as handleTimelineEvent } from '@app/event/timeline';
import type { Payload } from '@app/event/type';
import { handle as handleUserEvent, handleFriend as handleFriendEvent } from '@app/event/user';
import { newConsumer } from '@app/lib/kafka.ts';
import { logger } from '@app/lib/logger';
import { handleTimelineMessage } from '@app/lib/timeline/kafka.ts';

const TOPICS = [
  'timeline',

  // 'debezium.chii.bangumi.chii_pms',
  // 'debezium.chii.bangumi.chii_subject_revisions',
  'debezium.chii.bangumi.chii_blog_entry',
  'debezium.chii.bangumi.chii_characters',
  'debezium.chii.bangumi.chii_episodes',
  'debezium.chii.bangumi.chii_groups',
  'debezium.chii.bangumi.chii_group_members',
  'debezium.chii.bangumi.chii_index',
  'debezium.chii.bangumi.chii_members',
  'debezium.chii.bangumi.chii_friends',
  'debezium.chii.bangumi.chii_persons',
  'debezium.chii.bangumi.chii_subject_fields',
  'debezium.chii.bangumi.chii_subject_topics',
  'debezium.chii.bangumi.chii_subjects',
  'debezium.chii.bangumi.chii_timeline',
];

type Handler = (key: string, value: string) => Promise<void>;

const binlogHandlers: Record<string, Handler> = {
  chii_blog_entry: handleBlogEvent,
  chii_characters: handleCharacterEvent,
  chii_episodes: handleEpisodeEvent,
  chii_groups: handleGroupEvent,
  chii_group_members: handleGroupMemberEvent,
  chii_index: handleIndexEvent,
  chii_members: handleUserEvent,
  chii_friends: handleFriendEvent,
  chii_persons: handlePersonEvent,
  chii_subject_fields: handleSubjectFieldsEvent,
  chii_subject_topics: handleSubjectTopicEvent,
  chii_subjects: handleSubjectEvent,
  chii_timeline: handleTimelineEvent,
};

async function onBinlogMessage(key: string, value: string) {
  const payload = JSON.parse(value) as Payload;
  const handler = binlogHandlers[payload.source.table];
  if (!handler) {
    return;
  }
  await handler(key, value);
}

const serviceHandlers: Record<string, Handler> = {
  timeline: handleTimelineMessage,
};

async function onServiceMessage(topic: string, key: string, value: string) {
  const handler = serviceHandlers[topic];
  if (!handler) {
    return;
  }
  await handler(key, value);
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
          await onBinlogMessage(message.key.toString(), message.value.toString());
        } else {
          await onServiceMessage(topic, message.key.toString(), message.value.toString());
        }
      } catch (error) {
        logger.error(`Error processing message ${message.key.toString()}: ${error}`);
      }
    },
  });
}

await main();
