import { logger } from '@app/lib/logger';

import { type TimelineMessage, TimelineWriter } from './writer';

export async function handleTimelineMessage(op: string, details: string) {
  switch (op) {
    case 'subject': {
      const payload = JSON.parse(details) as TimelineMessage['subject'];
      await TimelineWriter.subject(payload);
      break;
    }
    case 'progressEpisode': {
      const payload = JSON.parse(details) as TimelineMessage['progressEpisode'];
      await TimelineWriter.progressEpisode(payload);
      break;
    }
    case 'progressSubject': {
      const payload = JSON.parse(details) as TimelineMessage['progressSubject'];
      await TimelineWriter.progressSubject(payload);
      break;
    }
    case 'statusTsukkomi': {
      const payload = JSON.parse(details) as TimelineMessage['statusTsukkomi'];
      await TimelineWriter.statusTsukkomi(payload);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${op}`);
      break;
    }
  }
}
