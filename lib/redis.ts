import IORedis from 'ioredis';

import { redisOption } from './config';

export default new IORedis(redisOption);
export const Subscriber = new IORedis(redisOption);
