import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyServerOptions } from 'fastify';

type AjvPlugin = NonNullable<NonNullable<FastifyServerOptions['ajv']>['plugins']>[number];

export const keywordPlugin: AjvPlugin = (ajvInstance: Ajv) => {
  ajvInstance.addKeyword({ keyword: 'x-examples' });
  ajvInstance.addKeyword({ keyword: 'x-ms-enum' });
  ajvInstance.addKeyword({ keyword: 'x-enum-varnames' });
  return ajvInstance;
};

export const formatsPlugin: AjvPlugin = (ajvInstance: Ajv) => addFormats(ajvInstance);

export const ajvPlugins: AjvPlugin[] = [keywordPlugin, formatsPlugin];

export function buildAjvOptions(): FastifyServerOptions['ajv'] {
  return { plugins: ajvPlugins };
}
