// Checklist prompts, not eligibility determinations. Each notice controls what applicants submit.
const common = ['주민등록표등본(세대원 표시 범위 확인)', '상세 가족관계증명서(발급 대상 확인)', '개인정보 수집·이용 및 제공동의서(공고 양식)']
const student = '재학·입학예정·졸업 증명서 중 해당 서류'
const priority = '순위 증빙서류(해당 시 수급자·차상위·한부모 증명서 등)'
const assets = '금융정보 제공동의서 및 소득·자산 보완자료(요청 시)'
const presets = {
  전세임대: {
    eligibility: ['청년 공급분은 미혼·무주택 여부와 만 19~39세·대학생·취업준비생 중 해당 자격 확인', '신청 순위에 따라 본인 또는 부모 포함 소득·자산 심사 범위 확인', '선정 후 지역별 지원 한도와 권리분석 요건에 맞는 전세주택 물색'],
    documents: [...common, priority, student, assets],
  },
  행복주택: {
    eligibility: ['청년 공급 물량 및 미혼·무주택 요건 확인(만 19~39세 또는 사회초년생 요건)', '가구원 수별 월평균소득 기준 확인(일반 청년 기준 예시 100%, 1인 120%·2인 110%)', '해당 계층의 총자산·자동차 기준과 자격완화 적용 여부 확인'],
    documents: [...common, '온라인 청약용 본인인증 수단(공동인증서 등)', assets, '건강보험 자격득실확인서·근로 경력 증빙(사회초년생 등 해당 시)'],
  },
  매입임대: {
    eligibility: ['청년 공급분의 미혼·무주택 및 연령·학적·취업준비 요건 확인', '모집 순위별 소득·자산 심사 대상 확인(본인 또는 부모 포함)', '모집 단위별 1인 1주택 신청 및 중복 신청 제한 확인'],
    documents: [...common, '청약신청서(공고 양식)', '주민등록표초본(주소 이력 요구 시)', priority, assets, student],
  },
  기숙사: {
    eligibility: ['대학생·대학원생·입학예정자 또는 청년 등 순위별 모집 대상 확인', '공고일 기준 미혼 여부와 본인의 무주택 요건 확인', '본인·부모 소득 심사 범위와 신청 순위 확인'],
    documents: [...common, '기숙사형 청년주택 입주신청서(지정 양식)', student, priority, '소득 심사 보완서류(요청 시)'],
  },
  국민임대: {
    eligibility: ['모집공고일 기준 무주택세대구성원 요건 확인', '세대원 수별 소득 상한과 총자산·자동차 기준 확인', '단독세대주 신청 가능 면적, 거주지 및 청약저축 순위 확인'],
    documents: [...common, assets, '청약통장 순위확인서(청약저축 순위 적용 시)', '주민등록표초본(거주기간 증빙 시)'],
  },
  영구임대: {
    eligibility: ['공고일 기준 무주택세대구성원 여부 확인', '수급자·보호대상 한부모 등 해당 공급 대상과 선정 순위 확인', '해당 대상의 소득·자산 요건 및 지자체 거주 요건 확인'],
    documents: [...common, '영구임대 공급신청서(모집기관 양식)', priority, assets],
  },
  청년: {
    eligibility: ['청년 공급 물량과 공고일 기준 연령·학적 등 신청 계층 확인', '본인 및 세대원의 무주택 심사 범위 확인', '가구원 수와 공급 순위에 따른 소득·자산 요건 확인'],
    documents: [...common, '입주신청서(모집기관 양식)', assets, priority, student],
  },
}

export function presetFor(type, title) {
  const detail = type.replace(/\s+/g, '')
  const name = title.replace(/\s+/g, '')
  if ((detail + name).includes('기숙사')) return presets.기숙사
  const types = Object.keys(presets).filter(key => key !== '청년')
  const match = types.find(key => detail.includes(key)) ?? types.find(key => name.includes(key))
  return presets[match ?? '청년']
}
