import { logger } from '@app/lib/logger';

import { TimelineWriter } from './writer';

export async function handleTimelineMessage(op: string, details: string) {
  switch (op) {
    case 'subject': {
      const payload = JSON.parse(details) as {
        userID: number;
        subjectID: number;
      };
      await TimelineWriter.subject(payload.userID, payload.subjectID);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${op}`);
      break;
    }
  }
}
