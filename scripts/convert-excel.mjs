import { readExcelNotices, writeNotices } from './notice-files.mjs'

const notices = readExcelNotices(process.argv[2])
await writeNotices(notices)
console.log(`청년 주택 공고 ${notices.length}건, 10개 열 → src/data/notices.json`)
