import type * as http from 'node:http';
import type * as https from 'node:https';

import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

export function getProxyAgent(proxy: string): { http: http.Agent; https: https.Agent } | undefined {
  const u = new URL(proxy);

  if (['http:', 'https:'].includes(u.protocol)) {
    return {
      http: new HttpProxyAgent(proxy, { keepAlive: true }),
      https: new HttpsProxyAgent(proxy, { keepAlive: true }),
    };
  }

  if (u.protocol === 'socks:') {
    return {
      http: new SocksProxyAgent(proxy, { keepAlive: true }),
      https: new SocksProxyAgent(proxy, { keepAlive: true }),
    };
  }

  throw new Error('DEV: add your proxy agent here, or use a http/https/socks proxy');
}
