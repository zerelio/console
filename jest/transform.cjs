/**
 * Custom Jest transform for TypeScript files.
 * Strips import.meta.env references (Vite-specific) so tests can
 * run in Node without a build pipeline, then delegates to ts-jest.
 */
const { default: tsJest } = require('ts-jest');

const transformer = tsJest.createTransformer();

module.exports = {
  process(sourceText, sourcePath, options) {
    // Replace Vite's import.meta.env expressions with static defaults
    const patched = sourceText
      .replace(/import\.meta\.env\.VITE_API_BASE_URL\b/g, JSON.stringify('/api/v1'))
      .replace(/import\.meta\.env\b/g, JSON.stringify({ VITE_API_BASE_URL: '/api/v1' }));
    return transformer.process(patched, sourcePath, options);
  },
  getCacheKey(sourceText, sourcePath, options) {
    return transformer.getCacheKey(sourceText, sourcePath, options);
  },
};
