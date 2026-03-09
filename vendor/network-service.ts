import type { Static } from 'typebox';
import t from 'typebox';

import { services } from './common/network_services.json';
import { assertValue } from './validate';

const NetworkServiceSchema = t.Object(
  {
    name: t.String(),
    title: t.String(),
    url: t.Optional(t.String()),
    bg_color: t.String(),
    validate: t.Optional(t.String()),
  },
  { additionalProperties: false },
);

const NetworkServicesSchema = t.Record(t.String(), NetworkServiceSchema);

export type NetworkService = Static<typeof NetworkServiceSchema>;

const checkedNetworkServicesRaw: unknown = services;
assertValue(NetworkServicesSchema, checkedNetworkServicesRaw, 'network_services.json');
const checkedNetworkServices = checkedNetworkServicesRaw;

export function findNetworkService(serviceID: number): NetworkService | undefined {
  return checkedNetworkServices[serviceID];
}
