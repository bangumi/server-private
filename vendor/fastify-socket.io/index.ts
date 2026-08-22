import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { Server, type ServerOptions } from 'socket.io';

export type FastifySocketioOptions = Partial<ServerOptions> & {
  preClose?: (done: () => void) => void;
};

/* eslint-disable-next-line @typescript-eslint/require-await */
const plugin: FastifyPluginAsync<FastifySocketioOptions> = async function (fastify, opts) {
  function defaultPreClose(done: () => void) {
    fastify.io.local.disconnectSockets(true);
    done();
  }

  fastify.decorate('io', new Server(fastify.server, opts));

  fastify.addHook('preClose', (done) => {
    if (opts.preClose) {
      return opts.preClose(done);
    }
    return defaultPreClose(done);
  });

  fastify.addHook('onClose', (fastify, done) => {
    void fastify.io.close();
    done();
  });
};

const fastifySocketIO = fastifyPlugin(plugin, { fastify: '>=4.x.x', name: 'fastify-socket.io' });

export default fastifySocketIO;
