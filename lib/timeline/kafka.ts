import { logger } from '@app/lib/logger';

import { type TimelineMessage, TimelineWriter } from './writer';

interface Payload {
  op: string;
  details: TimelineMessage[keyof TimelineMessage];
}

export async function handleTimelineMessage(_: string, value: string) {
  const payload = JSON.parse(value) as Payload;

  switch (payload.op) {
    case 'subject': {
      await TimelineWriter.subject(payload.details as TimelineMessage['subject']);
      break;
    }
    case 'progressEpisode': {
      await TimelineWriter.progressEpisode(payload.details as TimelineMessage['progressEpisode']);
      break;
    }
    case 'progressSubject': {
      await TimelineWriter.progressSubject(payload.details as TimelineMessage['progressSubject']);
      break;
    }
    case 'statusTsukkomi': {
      await TimelineWriter.statusTsukkomi(payload.details as TimelineMessage['statusTsukkomi']);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${payload.op}`);
      break;
    }
  }
}
