import { createRequire } from 'node:module';

import type NodeCache = require('node-cache');

const require = createRequire(import.meta.url);

export default require('node-cache') as typeof NodeCache;
