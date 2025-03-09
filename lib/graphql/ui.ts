import fastifyStatic from '@fastify/static';
import type { RenderOptions } from 'altair-static';
import { getDistDirectory, renderAltair, renderInitSnippet } from 'altair-static';
import type { FastifyPluginAsync } from 'fastify/types/plugin';

export interface AltairFastifyPluginOptions extends RenderOptions {
  /**
   * URL to set as the server endpoint.
   *
   * By default is `/graphql`
   */
  endpointURL?: string;
  /**
   * URL to be used as a base for relative URLs and hosting needed static files.
   *
   * By default is `/altair/`
   */
  baseURL?: string;
  /**
   * Path in which Altair will be accesible.
   *
   * By default is `/altair`
   */
  path?: string;
}

export const fastifyAltairPlugin: FastifyPluginAsync<AltairFastifyPluginOptions> = async (
  fastify,
  { path = '/altair', baseURL = '/altair/', endpointURL = '/graphql', ...renderOptions } = {},
) => {
  await fastify.register(fastifyStatic, {
    root: getDistDirectory(),
    prefix: baseURL,
  });

  const altairPage = renderAltair({ baseURL, endpointURL, ...renderOptions });

  fastify.get(path, (_req, res) => {
    return res.type('text/html').send(altairPage);
  });

  if (renderOptions.serveInitialOptionsInSeperateRequest) {
    const initialOptions = renderInitSnippet(renderOptions);
    const initOptPath = path + '/initial_options.js';

    fastify.get(initOptPath, (_req, res) => {
      return res.type('application/javascript').send(initialOptions);
    });
  }
};
