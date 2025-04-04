const path = require('path')
const fs = require('fs')

const ensureDirectoryExistence = (filePath) => {
  const dirname = path.dirname(filePath)
  if (fs.existsSync(dirname)) {
    return true
  }
  fs.mkdirSync(dirname, { recursive: true })
}

const postcss = require('postcss')
const autoprefixer = require('autoprefixer')
const postcssCalc = require('postcss-calc')
const postcssVarOptimize = require('postcss-var-optimize')
const cleanCSS = require('clean-css')

const writeOutput = async (output, result, options) => {
  options = options || []

  console.log('Rendering Complete, saving .css file...')

  const map =
    options.indexOf('--map') >= 0
      ? { prev: result.map.toString(), inline: false, sourcesContent: false }
      : false

  result = await postcss([
    autoprefixer,
    options.indexOf('--full') < 0 ? postcssVarOptimize : postcssCalc,
  ]).process(result.css, { map, from: output + '.css', to: output + '.css' })

  const p = []
  p.push(
    new Promise((resolve, reject) =>
      fs.writeFile(output + '.css', result.css, (err) =>
        err
          ? console.error(err) || reject()
          : console.log('Wrote to ' + output + '.css') || resolve(),
      ),
    ),
  )

  if (result.map) {
    p.push(
      new Promise((resolve, reject) =>
        fs.writeFile(output + '.css.map', result.map.toString(), (err) =>
          err
            ? console.error(err) || reject()
            : console.log('Wrote to ' + output + '.css.map') || resolve(),
        ),
      ),
    )
  }

  if (options.indexOf('--min') >= 0) {
    p.push(
      new Promise((resolve, reject) =>
        fs.writeFile(
          output + '.min.css',
          new cleanCSS({ level: 2 }).minify(result.css).styles,
          (err) =>
            err
              ? console.error(err) || reject()
              : console.log('Wrote to ' + output + '.min.css') || resolve(),
        ),
      ),
    )
  }

  await Promise.all(p)
}

const watched = []
const watch = (render, cb) => {
  render.stats.includedFiles.map((file) => {
    watched.push(
      fs.watch(file, () => {
        cb(file)
      }),
    )
  })
}

const unwatch = () => {
  watched.map((watcher) => {
    watcher.close()
  })
}

const partition = (array, isValid) => {
  return array.reduce(
    ([pass, fail], elem) => {
      return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]]
    },
    [[], []],
  )
}

module.exports = {
  ensureDirectoryExistence,
  writeOutput,
  partition,
  watch,
  unwatch,
}
