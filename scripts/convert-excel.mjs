import XLSX from 'xlsx'
import { mkdir, rename, writeFile, rm } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const input = process.argv[2] ? resolve(process.argv[2]) : resolve(root, 'youth_housing_data.xlsx')
const output = resolve(root, 'src/data/notices.json')
const fields = ['공고명', '기관_유형', '지역', '접수마감일', '핵심자격_요약', '필수준비물', '임대조건_혜택', '세부안내_주의사항', '공식신청_URL', '기준일']
const dates = new Set(['접수마감일', '기준일'])

function dateValue(value, field, row, date1904) {
  const raw = String(value ?? '').trim()
  if (field === '접수마감일' && raw.replace(/\s/g, '') === '상시모집') return '상시모집'
  let parts
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value, { date1904 })
    if (parsed) parts = [parsed.y, parsed.m, parsed.d]
  } else {
    const match = /^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})[일.]?$/.exec(raw)
    if (match) parts = match.slice(1).map(Number)
  }
  if (parts) {
    const [y,m,d] = parts
    const date = new Date(Date.UTC(y,m-1,d))
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d) return date.toISOString().slice(0,10)
  }
  throw new Error(`${row}행 ${field}의 날짜를 확인하세요. 입력값: ${raw}`)
}

const workbook = XLSX.readFile(input)
const sheet = workbook.Sheets['청년 주택 공고']
if (!sheet) throw new Error('청년 주택 공고 시트를 찾을 수 없습니다.')
const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: '', blankrows: true, range: 0})
const headers = (rows[0] ?? []).map(v => String(v).trim())
for (const name of fields) {
  if (headers.filter(v => v === name).length !== 1) throw new Error(`첫 행에서 열 이름을 확인하세요: ${name}`)
}
const notices = []
for (const [index, row] of rows.entries()) {
  if (!index || row.every(v => String(v).trim() === '')) continue
  const values = fields.map(field => {
    const column = headers.indexOf(field)
    const cell = sheet[XLSX.utils.encode_cell({r:index, c:column})]
    let value = row[column] ?? ''
    if (field === '공식신청_URL' && !/^https?:\/\//i.test(String(value)) && cell?.l?.Target) {
      value = cell.l.Target.replaceAll('&amp;', '&')
    }
    return [field, dates.has(field) ? dateValue(value, field, index+1, !!workbook.Workbook?.WBProps?.date1904) : String(value).trim()]
  })
  const notice = Object.fromEntries(values)
  if (!notice.공고명) throw new Error(`${index+1}행 공고명이 비어 있습니다.`)
  if (notice.공식신청_URL && !/^https?:\/\//i.test(notice.공식신청_URL)) throw new Error(`${index+1}행 공식신청_URL을 확인하세요.`)
  notices.push(notice)
}
await mkdir(dirname(output), {recursive:true})
const temporary = output + '.' + process.pid + '.tmp'
try {
  await writeFile(temporary, JSON.stringify(notices, null, 2) + '\n', 'utf8')
  await rename(temporary, output)
} finally {
  await rm(temporary, {force: true})
}
console.log(`청년 주택 공고 ${notices.length}건, ${fields.length}개 열 → src/data/notices.json`)
