import { logger } from '@app/lib/logger';

import { type TimelineMessage, TimelineWriter } from './writer';

interface Payload {
  op: string;
  message: TimelineMessage[keyof TimelineMessage];
}

export async function handleTimelineMessage(topic: string, key: string, value: string) {
  const payload = JSON.parse(value) as Payload;

  switch (payload.op) {
    case 'daily': {
      await TimelineWriter.daily(payload.message as TimelineMessage['daily']);
      break;
    }
    case 'wiki': {
      await TimelineWriter.wiki(payload.message as TimelineMessage['wiki']);
      break;
    }
    case 'subject': {
      await TimelineWriter.subject(payload.message as TimelineMessage['subject']);
      break;
    }
    case 'progressEpisode': {
      await TimelineWriter.progressEpisode(payload.message as TimelineMessage['progressEpisode']);
      break;
    }
    case 'progressSubject': {
      await TimelineWriter.progressSubject(payload.message as TimelineMessage['progressSubject']);
      break;
    }
    case 'statusSign': {
      await TimelineWriter.statusSign(payload.message as TimelineMessage['statusSign']);
      break;
    }
    case 'statusTsukkomi': {
      await TimelineWriter.statusTsukkomi(payload.message as TimelineMessage['statusTsukkomi']);
      break;
    }
    case 'statusNickname': {
      await TimelineWriter.statusNickname(payload.message as TimelineMessage['statusNickname']);
      break;
    }
    case 'mono': {
      await TimelineWriter.mono(payload.message as TimelineMessage['mono']);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${payload.op}`);
      break;
    }
  }
}
