// esbuild bundler for the FAF VS Code extension.
//
// - platform node, format cjs (the VS Code extension host is CommonJS Node)
// - `vscode` external: provided by the extension host at runtime
// - `faf-scoring-kernel` external: it is `wasm-pack --target nodejs` (CJS,
//   synchronous `__dirname` + `readFileSync`). It MUST resolve against a real
//   node_modules dir so `__dirname` points at the real .wasm file.
//
// import.meta.url shim: faf-cli's published dist/index.js is bun-built ESM that
// does `createRequire(import.meta.url)` to load the kernel. esbuild's CJS output
// would replace `import.meta` with `{}`, making `createRequire(undefined)` throw
// at load. We map `import.meta.url` to a real file URL via a banner-defined const
// (the documented esbuild CJS interop recipe).
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.js',
  external: ['vscode', 'faf-scoring-kernel'],
  define: {
    'import.meta.url': '__faf_import_meta_url',
  },
  banner: {
    js: "const __faf_import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  metafile: true,
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('esbuild: watching…');
    return;
  }
  const result = await esbuild.build(options);
  for (const warning of result.warnings) {
    console.warn('WARNING:', warning.text, JSON.stringify(warning.location));
  }
  const out = result.metafile.outputs['dist/extension.js'];
  if (out) {
    console.log(`dist/extension.js — ${(out.bytes / 1024).toFixed(1)} KB (${out.bytes} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
