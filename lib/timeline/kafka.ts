import { logger } from '@app/lib/logger';

import { type TimelineMessage, TimelineWriter } from './writer';

export async function handleTimelineMessage(op: string, details: string) {
  switch (op) {
    case 'subject': {
      await TimelineWriter.subject(JSON.parse(details) as TimelineMessage['subject']);
      break;
    }
    case 'progressEpisode': {
      await TimelineWriter.progressEpisode(
        JSON.parse(details) as TimelineMessage['progressEpisode'],
      );
      break;
    }
    case 'progressSubject': {
      await TimelineWriter.progressSubject(
        JSON.parse(details) as TimelineMessage['progressSubject'],
      );
      break;
    }
    case 'statusTsukkomi': {
      await TimelineWriter.statusTsukkomi(JSON.parse(details) as TimelineMessage['statusTsukkomi']);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${op}`);
      break;
    }
  }
}
