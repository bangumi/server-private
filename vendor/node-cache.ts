import { createRequire } from 'node:module';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import type NodeCache = require('node-cache');

const require = createRequire(import.meta.url);

export default require('node-cache') as typeof NodeCache;
