import fs from 'fs'
import path from 'path'

const distDir = path.resolve(process.cwd(), 'dist')
const assetsDir = path.join(distDir, 'assets')

const maxJsKb = Number(process.env.MAX_JS_KB || 1500)
const maxCssKb = Number(process.env.MAX_CSS_KB || 300)
const maxTotalKb = Number(process.env.MAX_TOTAL_KB || 2000)

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets not found. Run build first.')
  process.exit(1)
}

const files = fs.readdirSync(assetsDir).map(name => {
  const filePath = path.join(assetsDir, name)
  const stat = fs.statSync(filePath)
  return {
    name,
    size: stat.size,
    ext: path.extname(name).toLowerCase(),
  }
})

const toKb = bytes => Math.round((bytes / 1024) * 100) / 100

const totals = files.reduce(
  (acc, file) => {
    acc.total += file.size
    if (file.ext === '.js') acc.js += file.size
    if (file.ext === '.css') acc.css += file.size
    return acc
  },
  { total: 0, js: 0, css: 0 }
)

const jsKb = toKb(totals.js)
const cssKb = toKb(totals.css)
const totalKb = toKb(totals.total)

const failures = []
if (jsKb > maxJsKb) failures.push(`JS ${jsKb}KB > ${maxJsKb}KB`)
if (cssKb > maxCssKb) failures.push(`CSS ${cssKb}KB > ${maxCssKb}KB`)
if (totalKb > maxTotalKb) failures.push(`Total ${totalKb}KB > ${maxTotalKb}KB`)

const topFiles = [...files]
  .sort((a, b) => b.size - a.size)
  .slice(0, 5)
  .map(file => `${file.name} (${toKb(file.size)}KB)`)

console.log('Bundle size report')
console.log(`JS: ${jsKb}KB (limit ${maxJsKb}KB)`)
console.log(`CSS: ${cssKb}KB (limit ${maxCssKb}KB)`)
console.log(`Total: ${totalKb}KB (limit ${maxTotalKb}KB)`)
console.log('Top files:')
topFiles.forEach(line => console.log(`- ${line}`))

if (failures.length > 0) {
  console.error('Bundle size check failed:')
  failures.forEach(line => console.error(`- ${line}`))
  process.exit(1)
}
