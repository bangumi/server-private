import IORedis from 'ioredis';

import { redisOption } from './config';

export default new IORedis(redisOption);
