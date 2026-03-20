import type { Static } from 'typebox';
import t from 'typebox';

import { sources } from './common/timeline_sources.json';
import { assertValue } from './validate';

const TimelineSourceSchema = t.Object(
  {
    name: t.String(),
    url: t.Optional(t.String()),
    appID: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

const TimelineSourcesSchema = t.Record(t.String(), TimelineSourceSchema);

const checkedTimelineSourcesRaw: unknown = sources;
assertValue(TimelineSourcesSchema, checkedTimelineSourcesRaw, 'timeline_sources.json');
const checkedTimelineSources = checkedTimelineSourcesRaw;

export type TimelineSource = Static<typeof TimelineSourceSchema>;

export function findTimelineSource(sourceID: number): TimelineSource | undefined {
  return checkedTimelineSources[sourceID];
}

export function getTimelineSourceFromAppID(appID: string): number | undefined {
  if (!appID) {
    return;
  }
  for (const [idx, src] of Object.entries(checkedTimelineSources)) {
    if (!src.appID) {
      continue;
    }
    if (src.appID === appID) {
      return Number(idx);
    }
  }
  return;
}
