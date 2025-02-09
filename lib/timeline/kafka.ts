import { logger } from '@app/lib/logger';
import type { EpisodeCollectionStatus } from '@app/lib/subject/type';

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
    case 'progressEpisode': {
      const payload = JSON.parse(details) as {
        userID: number;
        subjectID: number;
        episodeID: number;
        status: EpisodeCollectionStatus;
      };
      await TimelineWriter.progressEpisode(
        payload.userID,
        payload.subjectID,
        payload.episodeID,
        payload.status,
      );
      break;
    }
    case 'progressSubject': {
      const payload = JSON.parse(details) as {
        userID: number;
        subjectID: number;
        epsUpdate?: number;
        volsUpdate?: number;
      };
      await TimelineWriter.progressSubject(
        payload.userID,
        payload.subjectID,
        payload.epsUpdate,
        payload.volsUpdate,
      );
      break;
    }
    case 'statusTsukkomi': {
      const payload = JSON.parse(details) as {
        userID: number;
        text: string;
      };
      await TimelineWriter.statusTsukkomi(payload.userID, payload.text);
      break;
    }
    default: {
      logger.error(`Unknown timeline operation: ${op}`);
      break;
    }
  }
}
