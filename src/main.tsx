import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { House, Building2, MapPin, CalendarDays, Clock3, ChevronDown, Check, CircleCheck, ListFilter, ListChecks, RotateCcw, ExternalLink, ClipboardCheck, UserRoundCheck, BadgeInfo, FileText, Landmark, Globe2, Info, SearchX, ArrowDownWideNarrow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import rawNotices from './data/notices.json'
import { deadline, listItems, noticeKey, ordered, shortDate, todayInKorea } from './housing'
import type { Notice } from './housing'
import neighborhood from './assets/neighborhood.webp'
import './styles.css'

const notices: Notice[] = rawNotices
const latest = notices.map(n => n.기준일).sort().at(-1)
const agencies = [...new Set(notices.map(n => n.기관_유형))].filter(Boolean)
const regions = [...new Set(notices.map(n => n.지역))].filter(Boolean)

function Header() {
  return <header><div className="shell header-inner">
    <a className="brand" href="#top" aria-label="청년 주거 혜택 한눈에 보기 홈"><span className="brand-icon"><House size={23} strokeWidth={2.5}/></span>청년주거 가이드</a>
    <nav aria-label="주요 메뉴"><a href="#notices">공고 살펴보기</a><a href="#portals">공식 포털</a></nav>
    {latest && <span className="reference"><CalendarDays size={15}/>기준일 <b>{shortDate(latest)}</b></span>}
  </div></header>
}

function Filter({label, options, value, change, icon: Icon}: {label: string, options: string[], value: string, change: (v: string) => void, icon: LucideIcon}) {
  return <label className="filter"><Icon size={16}/><select aria-label={label} value={value} onChange={e => change(e.target.value)}>
    <option value="">{label} 전체</option>{options.map(o => <option key={o}>{o}</option>)}
  </select><ChevronDown size={14} className="select-chevron"/></label>
}

function DeadlineBadge({value, today}: {value: string, today: string}) {
  const status = deadline(value, today)
  return <span className={'badge ' + status.tone}><i/>{status.label}</span>
}

function NoticeCard({n, today, active, choose}: {n: Notice, today: string, active: boolean, choose: () => void}) {
  return <button className={'notice-card ' + (active ? 'selected' : '')} aria-pressed={active} aria-controls="notice-detail" onClick={choose}>
    <span className="card-meta"><DeadlineBadge value={n.접수마감일} today={today}/><span className="agency">{n.기관_유형}</span><span className="selection">{active && <Check size={12} strokeWidth={3}/>}</span></span>
    <strong>{n.공고명}</strong>
    <span className="card-foot"><span><MapPin size={14}/>{n.지역}</span><em/><span><CalendarDays size={14}/>{n.접수마감일 === '상시모집' ? '상시 접수' : shortDate(n.접수마감일) + ' 마감'}</span></span>
  </button>
}

function PanelHeading({icon: Icon, text}: {icon: LucideIcon, text: string}) {
  return <h3 className="panel-head"><span><Icon size={20}/></span>{text}</h3>
}

function Checklist({n}: {n: Notice}) {
  const items = listItems(n.필수준비물)
  const key = 'youth-housing:documents:v1:' + noticeKey(n)
  const [checked, setChecked] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(saved) ? items.filter(item => saved.includes(item)) : []
    } catch { return [] }
  })
  const [saveError, setSaveError] = useState(false)
  function save(next: string[]) {
    setChecked(next)
    try {
      if (next.length) localStorage.setItem(key, JSON.stringify(next))
      else localStorage.removeItem(key)
      setSaveError(false)
    } catch { setSaveError(true) }
  }
  const percent = items.length ? Math.round(checked.length / items.length * 100) : 0
  return <section className="panel documents"><div className="check-head"><PanelHeading icon={ClipboardCheck} text="필수 준비물"/><button className="reset" onClick={() => save([])} disabled={!checked.length}><RotateCcw size={13}/>초기화</button></div>
    <div className="progress-label"><span>준비 완료율</span><b aria-live="polite">{percent}%</b></div>
    <progress max="100" value={percent} aria-label="준비 완료율"/>
    <div className="checklist">{items.length ? items.map((s,i) => <label key={i}><input type="checkbox" checked={checked.includes(s)} onChange={e => save(e.target.checked ? [...checked,s] : checked.filter(x => x !== s))}/><span>{s}</span></label>) : <p>공고문을 확인해 주세요.</p>}</div>
    {saveError && <small role="status">브라우저 저장소를 사용할 수 없어 이번 화면에서만 체크 상태가 유지됩니다.</small>}
  </section>
}

function NoticeDetail({n, today}: {n: Notice, today: string}) {
  const timing = deadline(n.접수마감일, today)
  const items = listItems(n.핵심자격_요약)
  return <section id="notice-detail" aria-label="선택한 공고 상세">
    <div className="detail-meta"><span className="detail-label"><FileText size={15}/>선택한 공고</span><span>{n.기관_유형}</span><span className="detail-region"><MapPin size={14}/>{n.지역}</span></div>
    <h2 className="notice-title">{n.공고명}</h2>
    <div className="summaries">
      <section className="panel deadline-panel"><PanelHeading icon={CalendarDays} text="접수 마감 기한"/>
        <strong className={'big-day ' + timing.tone}>{timing.label}</strong>
        {n.접수마감일 !== '상시모집' && <p className="deadline-date">{new Intl.DateTimeFormat('ko-KR',{dateStyle:'full',timeZone:'UTC'}).format(new Date(n.접수마감일))}</p>}
        <span className="timing-note"><Clock3 size={15}/>{timing.tone === 'rolling' ? '세부 접수 일정은 아래 안내를 확인하세요.' : timing.tone === 'urgent' ? '마감이 임박했어요' : timing.tone === 'closed' ? '접수가 종료되었어요' : '접수 시간을 확인하세요'}</span>
      </section>
      <section className="panel"><PanelHeading icon={UserRoundCheck} text="핵심 신청 자격"/>
        <ul className="criteria">{items.length ? items.map((s,i) => <li key={i}><CircleCheck size={17}/><span>{s}</span></li>) : <li>공고문을 확인해 주세요.</li>}</ul>
      </section>
      <Checklist n={n}/>
    </div>
    <div className="details-list">{[[Building2,'임대조건 및 혜택',n.임대조건_혜택],[BadgeInfo,'세부 안내 및 주의사항',n.세부안내_주의사항]].map(entry => {
      const [Icon,title,body] = entry as [LucideIcon,string,string]
      return <details key={title}><summary><Icon size={19}/>{title}<ChevronDown size={18} className="chevron"/></summary><p>{body || '공고문을 확인해 주세요.'}</p></details>
    })}</div>
    {n.공식신청_URL && <a className="cta" href={n.공식신청_URL} target="_blank" rel="noopener noreferrer">공식 공고문 확인 및 신청하기<ExternalLink size={17}/></a>}
  </section>
}

function Portals() {
  const portals = [{name:'LH청약플러스', url:'https://apply.lh.or.kr/', Icon: Building2}, {name:'서울주거포털', url:'https://housing.seoul.go.kr/', Icon: Landmark}, {name:'온통청년', url:'https://www.youthcenter.go.kr/', Icon: Globe2}]
  return <section id="portals"><h2>공식 포털 바로가기</h2><p>기숙사형 청년주택 등 더 많은 공고를 찾아보세요.</p>
    <div className="portal-links">{portals.map(({name,url,Icon}) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><Icon size={21}/>{name}<ExternalLink size={16}/></a>)}</div>
  </section>
}

function App() {
  const [today, setToday] = useState(todayInKorea)
  useEffect(() => {
    // Recompute at the next Korean midnight and on return from a suspended tab.
    const update = () => setToday(todayInKorea())
    const next = Date.parse(today + 'T00:00:00+09:00') + 86400000
    const timer = window.setTimeout(update, Math.max(100, next - Date.now() + 50))
    document.addEventListener('visibilitychange', update)
    return () => {clearTimeout(timer); document.removeEventListener('visibilitychange', update)}
  }, [today])
  const [agency, setAgency] = useState(''), [region, setRegion] = useState('')
  const [choice, setChoice] = useState('')
  const [limit, setLimit] = useState(6)
  const [page, setPage] = useState(1)
  const visible = ordered(notices.filter(n => (!agency || agency === n.기관_유형) && (!region || region === n.지역)), today)
  const pageSize = limit || Math.max(1, visible.length)
  const pageCount = Math.ceil(visible.length / pageSize)
  const current = Math.min(page, Math.max(1, pageCount))
  const offset = (current - 1) * pageSize
  const cards = visible.slice(offset, offset + pageSize)
  const selected = cards.find(n => noticeKey(n) === choice) ?? cards[0]
  function resetPage() { setPage(1); setChoice('') }
  const changeFilter = (set: (v:string) => void) => (v:string) => { set(v); resetPage() }
  function movePage(next: number) {
    setPage(next)
    setChoice('')
    document.getElementById('notices')?.scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})
  }
  return <div id="top"><Header/><main className="shell">
    <section className="hero"><div className="hero-copy"><h1>청년 주거 혜택 <span>한눈에 보기</span></h1><p>내게 맞는 임대주택 공고를 찾고,<br/>신청 자격부터 준비 서류까지 함께 확인하세요.</p></div><img src={neighborhood} alt="" fetchPriority="high"/></section>
    <section id="notices"><div className="section-top"><div className="section-heading"><h2>주택 공고</h2><span className="count" aria-live="polite">{visible.length}건</span></div>
      <div className="filters"><Filter icon={Building2} label="기관·유형" options={agencies} value={agency} change={changeFilter(setAgency)}/><Filter icon={MapPin} label="지역" options={regions} value={region} change={changeFilter(setRegion)}/></div></div>
      <div className="list-toolbar"><span className="sort"><ArrowDownWideNarrow size={15}/>마감 임박순</span>
        <label className="page-size">한 번에 보기
          <span className="filter"><select value={limit} onChange={e => {setLimit(Number(e.target.value)); resetPage()}}>
            {[6,12,24].map(size => <option key={size} value={size}>{size}개씩 보기</option>)}
            <option value={0}>전체 보기</option>
          </select><ChevronDown size={14} className="select-chevron"/></span>
        </label>
      </div>
      <div className="notice-grid" role="group" aria-label="공고 선택">{cards.map(n => <NoticeCard key={noticeKey(n)} n={n} today={today} active={n === selected} choose={() => setChoice(noticeKey(n))}/>)}</div>
      <p className="page-range" role="status">전체 {visible.length}건{cards.length > 0 && ` 중 ${offset + 1}~${offset + cards.length}건`}</p>
      {pageCount > 1 && <nav className="pagination" aria-label="공고 목록 페이지">
        <button disabled={current === 1} onClick={() => movePage(current - 1)}>이전</button>
        {Array.from({length: pageCount}, (_, i) => i + 1).map(number =>
          <button key={number} aria-label={number + '페이지'} aria-current={number === current ? 'page' : undefined} onClick={() => movePage(number)}>{number}</button>
        )}
        <button disabled={current === pageCount} onClick={() => movePage(current + 1)}>다음</button>
      </nav>}
      {!visible.length && <div className="empty"><SearchX size={30}/><p>{notices.length ? '조건에 맞는 공고가 없습니다.' : '등록된 공고가 없습니다.'}</p>{(agency || region) && <button onClick={() => {setRegion('');setAgency('');setChoice('')}}><ListFilter size={16}/>필터 초기화</button>}</div>}
    </section>
    {selected && <NoticeDetail key={noticeKey(selected)} n={selected} today={today}/>}
    <Portals/>
  </main><footer><div className="shell"><Info size={17}/><p>최종 신청 전에는 반드시 해당 기관의 공식 공고문에서 자격 요건과 접수 일정을 확인해 주세요.</p></div></footer></div>
}

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
