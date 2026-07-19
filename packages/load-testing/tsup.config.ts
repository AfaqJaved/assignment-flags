import { defineConfig } from 'tsup';

// k6 runs the *bundled* output directly (there's no Node.js runtime, no
// require() of node_modules, and no TypeScript support at all) — tsup here
// only strips types and inlines any local TS helpers into a single file.
// `k6`/`k6/*` and the k6-reporter URL must stay as literal `import`
// statements: k6's own runtime resolves those natively (core modules
// in-process, the `https://` one over the network at run time), so they're
// marked external rather than bundled.
export default defineConfig({
  entry: ['src/evaluate.load.test.ts'],
  format: ['esm'],
  target: 'es2019',
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  treeshake: false,
  external: [
    'k6',
    'k6/http',
    'k6/metrics',
    'k6/options',
    'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js',
    'https://jslib.k6.io/k6-summary/0.1.0/index.js',
  ],
});
