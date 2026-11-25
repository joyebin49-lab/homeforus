export interface Notice {
  공고명: string
  기관_유형: string
  지역: string
  접수마감일: string
  핵심자격_요약: string
  필수준비물: string
  임대조건_혜택: string
  세부안내_주의사항: string
  공식신청_URL: string
  기준일: string
}

const koreaDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
})
export const todayInKorea = () => koreaDate.format(new Date())
export const shortDate = (value: string) => value.replaceAll('-', '.')
export const listItems = (value: string) => value.split(';').map(s => s.trim()).filter(Boolean)
export const noticeKey = (n: Notice) => JSON.stringify([n.공고명, n.기관_유형, n.지역, n.공식신청_URL, n.접수마감일])

export function deadline(value: string, today: string) {
  if (value === '상시모집') return { label: value, tone: 'rolling', group: 1, order: 0 }
  const days = (Date.parse(value) - Date.parse(today)) / 86400000
  if (days < 0) return { label: '접수 마감', tone: 'closed', group: 2, order: -days }
  return { label: days === 0 ? 'D-Day' : `D-${days}`, tone: days <= 7 ? 'urgent' : 'upcoming', group: 0, order: days }
}

export function ordered(notices: Notice[], today: string) {
  return [...notices].sort((a, b) => {
    const one = deadline(a.접수마감일, today), two = deadline(b.접수마감일, today)
    return one.group - two.group || one.order - two.order || a.공고명.localeCompare(b.공고명, 'ko')
  })
}
