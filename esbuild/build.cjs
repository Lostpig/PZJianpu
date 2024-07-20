const esbuild = require('esbuild')

const optionsBase = {
  outdir: './public/dist',
  bundle: true,
  sourcemap: true,
  loader: {
    '.js': 'tsx',
    '.ts': 'ts',
    '.tsx': 'tsx'
  },
  external: [],
}

const execute = async () => {
  const argv = process.argv
  if (argv.indexOf('--prod') > 1) {

  }

  const options = Object.assign({}, optionsBase, {
    entryPoints: { test: './src/test.ts' },
    platform: 'browser',
    // mainFields: ['browser'],
  })

  if (argv.indexOf('--watch') > 1) {
    console.log('build for watch')
    const ctx = await esbuild.context(options)
    ctx.watch()
  } else {
    if (argv.indexOf('--prod') > 1) {
      console.log('build for prod')
      options.define = { 'process.env.NODE_ENV': "'production'" }
      options.minify = true
    }

    await esbuild.build(options)
  }
}

execute()