import { loadEnvFile } from 'node:process'
import { writeFile, rename, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const endpoint = 'https://apis.data.go.kr/B552555/lhLeaseNoticeInfo1/lhLeaseNoticeInfo1'
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
const start = new Date(today)
const day = start.getUTCDate()
start.setUTCDate(1)
start.setUTCMonth(start.getUTCMonth() - 2)
const monthEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0))
start.setUTCDate(Math.min(day, monthEnd.getUTCDate()))
const since = start.toISOString().slice(0, 10)

async function fetchPage(page, key) {
  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    serviceKey: key, PG_SZ: '100', PAGE: String(page),
    PAN_ST_DT: since.replaceAll('-', ''), PAN_ED_DT: today.replaceAll('-', ''),
  })
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error('LH API HTTP ' + response.status)
  const body = await response.text()
  let payload
  try { payload = JSON.parse(body) } catch {
    const code = body.match(/<returnReasonCode>(\d+)<\/returnReasonCode>/)?.[1]
    throw new Error('JSON 응답을 받지 못했습니다.' + (code ? ' API 오류 코드 ' + code : ''))
  }
  const result = Array.isArray(payload) && payload.find(block => block.resHeader)
  if (result?.resHeader?.[0]?.SS_CODE !== 'Y' || !Array.isArray(result.dsList)) {
    throw new Error('LH 응답의 성공 코드 또는 공고 목록을 확인할 수 없습니다.')
  }
  return result.dsList
}

const guidance = {
  '기숙사': ['대학생·대학원생 등 신청 가능 대상과 입주 순위를 확인하세요.', '재학·입학 관련 증빙의 제출 대상과 서식을 확인하세요.'],
  '행복주택': ['공급 계층에 청년이 포함되는지, 해당 계층의 소득·자산 요건을 확인하세요.', '해당 공급 계층의 제출서류 목록을 확인하세요.'],
  '전세임대': ['모집 대상과 우선순위, 주택 소유 요건을 확인하세요.', '신청 순위별 자격 증빙 목록을 확인하세요.'],
  '청년': ['공고의 청년 연령 기준과 소득·자산 요건을 확인하세요.', '청년 자격 증빙과 신청서 양식을 확인하세요.'],
}

function convert(row) {
  const title = row.PAN_NM?.trim()
  const description = [title, row.AIS_TP_CD_NM, row.UPP_AIS_TP_NM].join(' ').replace(/\s+/g, '')
  const category = Object.keys(guidance).find(word => description.includes(word))
  if (!category) return null
  const link = new URL((row.DTL_URL || row.DTL_URL_MOB || '').trim())
  if (!title || !['https:', 'http:'].includes(link.protocol)) throw new Error('공고명 또는 상세 URL 누락')
  const raw = String(row.CLSG_DT ?? '').trim()
  let deadline = raw.replace(/^(\d{4})[.\/-]?(\d{2})[.\/-]?(\d{2})$/, '$1-$2-$3')
  if (/^(상시|수시)(모집)?$/.test(raw)) deadline = '상시모집'
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline) || !Number.isFinite(Date.parse(deadline))) {
    throw new Error('마감일을 해석할 수 없습니다. 공고 ID ' + row.PAN_ID)
  }
  const [eligibility, documents] = guidance[category]
  return {
    공고명: title, 기관_유형: 'LH/' + (row.AIS_TP_CD_NM || row.UPP_AIS_TP_NM || category),
    지역: row.CNP_CD_NM || '공고문 확인', 접수마감일: deadline,
    핵심자격_요약: eligibility, 필수준비물: documents,
    임대조건_혜택: '보증금, 임대료 및 지원 한도는 공식 공고문의 공급 조건을 확인하세요.',
    세부안내_주의사항: [row.PAN_SS, row.PAN_NT_ST_DT && '게시일 ' + row.PAN_NT_ST_DT,
      '자격·서류 항목은 유형별 확인 안내입니다. 실제 신청 대상, 필수 서류와 접수 시간은 공식 공고문에서 확인하세요.'].filter(Boolean).join(' · '),
    공식신청_URL: link.href, 기준일: today,
  }
}

async function main() {
  if (!process.env.LH_API_KEY) loadEnvFile(fileURLToPath(new URL('.env', root)))
  const key = decodeURIComponent((process.env.LH_API_KEY || '').trim())
  if (!key) throw new Error('.env에 LH_API_KEY가 필요합니다.')
  const notices = new Map()
  let received = 0, total
  for (let page = 1; ; page++) {
    const rows = await fetchPage(page, key)
    total ??= Number(rows[0]?.ALL_CNT ?? 0)
    if (!Number.isSafeInteger(total) || total < 0 || (!rows.length && received < total)) {
      throw new Error('전체 조회 건수와 페이지 응답이 일치하지 않습니다.')
    }
    for (const row of rows) {
      const notice = convert(row)
      if (notice) notices.set(JSON.stringify([notice.공식신청_URL, notice.지역]), notice)
    }
    received += rows.length
    if (received >= total) break
  }
  const output = fileURLToPath(new URL('src/data/notices.json', root))
  const temporary = output + '.' + process.pid + '.tmp'
  try {
    await writeFile(temporary, JSON.stringify([...notices.values()], null, 2) + '\n')
    await rename(temporary, output)
  } finally { await rm(temporary, { force: true }) }
  console.log(`게시일 ${since} ~ ${today} | 수신 ${received}건 | 대상 공고 ${notices.size}건 저장`)
}

main().catch(error => {
  // Never log request objects, URLs, response bodies or credentials.
  console.error('LH 수집 실패:', error.message.replaceAll(process.env.LH_API_KEY || '\0', '[비공개]'))
  process.exitCode = 1
})
