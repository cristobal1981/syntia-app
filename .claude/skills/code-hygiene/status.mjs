#!/usr/bin/env node
// Libro de revisión de code-hygiene: guarda el hash git de cada fichero en el
// momento de revisarlo. Un fichero está pendiente si no consta o si su
// contenido actual difiere del revisado (hubo desarrollo después).
//
//   node status.mjs status [prefijo]     resumen por carpeta de módulo
//   node status.mjs list <prefijo>       ficheros pendientes bajo un prefijo
//   node status.mjs mark <ficheros...>   registra el estado actual como revisado
//   node status.mjs prune                olvida ficheros que ya no existen
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), 'reviewed.json')
const ROOTS = ['app', 'src', 'components', 'content', 'lib']
const CODE = /\.(ts|tsx)$/
const SKIP = /\.(test|spec)\.(ts|tsx)$|\.d\.ts$|^components\/ui\//

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const repoRoot = git('rev-parse', '--show-toplevel')
process.chdir(repoRoot)

const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {}
const save = () =>
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n')

const hashOf = (file) => git('hash-object', file)
const files = git('ls-files', '--', ...ROOTS)
  .split('\n')
  .filter((f) => f && CODE.test(f) && !SKIP.test(f) && existsSync(f))

const state = (file) => {
  const seen = ledger[file]
  if (!seen) return 'nuevo'
  return seen === hashOf(file) ? 'revisado' : 'cambiado'
}

const [cmd = 'status', ...rest] = process.argv.slice(2)

if (cmd === 'mark') {
  if (!rest.length) throw new Error('mark necesita al menos un fichero')
  for (const file of rest) {
    if (!existsSync(file)) throw new Error(`No existe: ${file}`)
    ledger[file] = hashOf(file)
  }
  save()
  console.log(`Marcados ${rest.length} fichero(s) como revisados.`)
} else if (cmd === 'prune') {
  let removed = 0
  for (const file of Object.keys(ledger)) {
    if (!existsSync(file)) {
      delete ledger[file]
      removed++
    }
  }
  save()
  console.log(`Olvidados ${removed} fichero(s) inexistentes.`)
} else if (cmd === 'list') {
  const prefix = rest[0] ?? ''
  for (const file of files.filter((f) => f.startsWith(prefix))) {
    const s = state(file)
    if (s !== 'revisado') console.log(`${s.padEnd(9)} ${file}`)
  }
} else {
  const prefix = rest[0] ?? ''
  const groups = new Map()
  for (const file of files.filter((f) => f.startsWith(prefix))) {
    const parts = file.split('/')
    const key = parts.slice(0, parts[0] === 'src' ? 3 : 2).join('/')
    const g = groups.get(key) ?? { nuevo: 0, cambiado: 0, revisado: 0 }
    g[state(file)]++
    groups.set(key, g)
  }
  const rows = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  let pending = 0
  let total = 0
  for (const [key, g] of rows) {
    const todo = g.nuevo + g.cambiado
    pending += todo
    total += todo + g.revisado
    if (todo) console.log(`${String(todo).padStart(4)} pend (${g.cambiado} cambiados)  ${key}`)
  }
  console.log(`\n${pending} pendientes de ${total} ficheros`)
}
