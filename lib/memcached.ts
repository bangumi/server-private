import { Client } from 'memjs';

import config from './config.ts';

const memcached = config.memcachedServers ? Client.create(config.memcachedServers) : null;

export default memcached;
