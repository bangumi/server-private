import Ajv from 'ajv';

export const ajv = new Ajv({
  strict: true,
  coerceTypes: true,
});
