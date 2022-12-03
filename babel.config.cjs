/**
 * babel is only used in jest, not at production
 */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
};
