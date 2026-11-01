import { Link, NavLink, useLocation } from 'react-router-dom'
import { NAV_ORDER, PLACES, PLACE_BY_ID, navLabel, placeColor } from '@/config/places'
import { SITE } from '@/config/site'
import { CHAPTER, CONTENT_UPDATED_AT } from '@/content'
import type { PlaceId } from '@/domain/types'
import { MiniCampus } from '@/features/campus/MiniCampus'
import { SoonTag } from './ApplyLink'
import s from './layout.module.css'

/** 'github.com/GDSC-DGU' 처럼 주소의 마지막 이름 */
const lastSegment = (url: string) => url.replace(/\/+$/, '').split('/').pop() ?? url

const organizers = CHAPTER.organizers.filter((o) => o.generation === 4)

/** 'https://gdg.community.dev/…' → 'gdg.community.dev' */
const hostOf = (url: string) => url.replace(/^https?:\/\//, '').split('/')[0]

/**
 * 출처 한 줄: 페이지마다 '○○ 기준' 을 되풀이하지 않도록 꼬리말에 한 번.
 * 기준일은 콘텐츠 갱신일(CONTENT_UPDATED_AT)의 연 · 월 ('2026.10').
 */
const sourcesBasis = [CHAPTER.chapterPage && hostOf(CHAPTER.chapterPage), CHAPTER.github && `GitHub ${lastSegment(CHAPTER.github)}`].filter(Boolean).join(' · ')
const updatedMonth = CONTENT_UPDATED_AT.slice(0, 7).replace('-', '.')

/** 협업 · 연사 제안 메일: 받는 쪽이 바로 분류할 수 있게 제목을 미리 채운다 */
const proposalMail = CHAPTER.email ? `mailto:${CHAPTER.email}?subject=${encodeURIComponent('[협업 · 연사 제안] ')}` : null

/** 지금 주소의 장소: 홈이면 'all'(모든 건물 장소색), 하위 페이지면 그 장소, 그 밖(관리자 · 없는 주소)은 null */
function placeOfPath(pathname: string): PlaceId | 'all' | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return 'all'
  return PLACES.find((p) => p.path !== '/' && (path === p.path || path.startsWith(`${p.path}/`)))?.id ?? null
}

/** 둘러보기 목록의 장소 표식 색: '홈'(소개 장소)의 먹색은 먹색 꼬리말에서 사라지므로 면의 글자색(흰색)으로 */
const footerMark = (id: PlaceId) => (id === 'about' ? 'var(--ink-900)' : placeColor(id))

/**
 * 꼬리말 (먹색 면): 이름 · 둘러보기(현재 위치 작은 지도) · 연락(협업 · 연사 제안 + 인스타그램 · GitHub · 챕터 페이지) · 지금 기수 · 안내 문구 · 출처 한 줄.
 * 연락처는 공개 출처가 있는 것만 (src/content/chapter.json, config/site.ts).
 * 바깥 채널은 모두 '어디'라는 이름으로 한 목록에 둔다. '{gen}기 소식 받기' 행동은 꼬리말 바로 위 JoinStrip(지원 안내는 머리)이 맡아,
 * 같은 버튼이 한 화면에 두 번 나오지 않게 한다.
 * 모든 페이지의 끝은 옅은 회색 '{gen}기에서 만나요'(common/JoinStrip) → 이 꼬리말이다 (/recruits 는 JoinStrip 없이 바로).
 */
export function SiteFooter() {
  const { pathname } = useLocation()
  const here = placeOfPath(pathname)
  return (
    <footer className={`on-dark ${s.footer}`}>
      <div className={`container ${s.footerGrid}`}>
        <div className={s.footerName}>
          <span className={s.wordmark} lang="en">
            {SITE.shortName}
          </span>
          <span lang="en">{SITE.fullName}</span>
        </div>

        <nav className={`${s.footerCol} ${s.footerBrowse}`} aria-labelledby="footer-browse">
          <h2 id="footer-browse">둘러보기</h2>
          <div className={s.browseBody}>
            <ul>
              {NAV_ORDER.map((id) => (
                <li key={id}>
                  <NavLink to={PLACE_BY_ID[id].path} end={id === 'about'} className={s.footerLink}>
                    <i className="mark" style={{ ['--c' as string]: footerMark(id) }} aria-hidden="true" />
                    {/* 이름과 '준비 중' 을 한 덩어리로: 링크 밑줄이 태그 아래까지 이어지지 않게 */}
                    <span>
                      {navLabel(id)}
                      <SoonTag place={id} />
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
            {/*
              현재 위치: 이 페이지의 건물만 장소색 (홈은 모두). 안내판의 '현재 위치' 지도처럼 옅은 판 위에.
              꾸밈 그림이고(읽지 않음), 위치는 목록의 aria-current 가 말한다
            */}
            <div className={s.here} aria-hidden="true">
              <MiniCampus here={here} className={s.miniCampus} />
              {here && <span className={s.hereLabel}>현재 위치 · {here === 'all' ? navLabel('about') : navLabel(here)}</span>}
            </div>
          </div>
        </nav>

        <div className={`${s.footerCol} ${s.footerContact}`}>
          <h2 id="footer-contact">연락</h2>
          {CHAPTER.email && proposalMail && (
            // 협업 · 연사 제안: 주소는 고를 수 있는 글자로, 메일 앱은 옆 링크로 (메일 앱이 없는 컴퓨터에서도 주소를 복사할 수 있게)
            <dl className={s.contactRow}>
              <dt id="footer-proposal">협업 · 연사 제안</dt>
              <dd>
                <span className={`num ${s.address}`}>{CHAPTER.email}</span>
                <a className={`${s.footerLink} ${s.footerAction}`} href={proposalMail} aria-describedby="footer-proposal">
                  메일 쓰기
                </a>
              </dd>
            </dl>
          )}
          <ul aria-labelledby="footer-contact">
            {/* 모집 소식을 가장 먼저 올리는 곳. 이름은 다른 채널처럼 '어디'로 ('{gen}기 소식 받기' 행동은 바로 위 JoinStrip · 지원 안내 머리가 맡는다) */}
            <li>
              <a className={s.footerLink} href={SITE.links.instagram} target="_blank" rel="noreferrer">
                인스타그램 {SITE.links.instagramHandle}
                <span aria-hidden="true">↗</span>
                <span className="visually-hidden"> (새 창)</span>
              </a>
            </li>
            {CHAPTER.github && (
              <li>
                <a className={s.footerLink} href={CHAPTER.github} target="_blank" rel="noreferrer">
                  GitHub {lastSegment(CHAPTER.github)}
                  <span aria-hidden="true">↗</span>
                  <span className="visually-hidden"> (새 창)</span>
                </a>
              </li>
            )}
            {CHAPTER.chapterPage && (
              <li>
                <a className={s.footerLink} href={CHAPTER.chapterPage} target="_blank" rel="noreferrer">
                  gdg.community.dev 챕터 페이지
                  <span aria-hidden="true">↗</span>
                  <span className="visually-hidden"> (새 창)</span>
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className={`${s.footerCol} ${s.footerGen}`}>
          <h2 id="footer-gen">{SITE.generation}</h2>
          <dl aria-labelledby="footer-gen" className={s.footerFacts}>
            <div>
              <dt>기간</dt>
              <dd className="num">{SITE.generationYears}</dd>
            </div>
            {organizers.map((o) => (
              <div key={o.name}>
                <dt lang="en">{o.role}</dt>
                <dd>{o.name}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={s.footerNotes}>
          <p>{SITE.shortName}는 동국대학교 학생이 운영하는 Google Developer Groups on Campus 챕터입니다. Google이 운영하거나 보증하는 단체가 아닙니다.</p>
          <p>이 홈페이지는 4기 G-Sprint 팀이 만들고 있습니다.</p>
          <p>그림 속 사람: Open Peeps (Pablo Stanley, CC0) · 지도 메모 글씨: 나눔손글씨 펜 (OFL)</p>
        </div>

        <div className={s.footerBottom}>
          {/* 출처 한 줄: 숫자 · 일정의 기준과 갱신 달 (페이지마다 되풀이하지 않는다) */}
          <span>
            숫자와 일정은 {sourcesBasis} 기준, <span className="num">{updatedMonth}</span> 갱신
          </span>
          <span>
            © <span className="num">2026</span> {SITE.shortName}
          </span>
          {/* 관리자 화면 (예시 화면 · 예시 데이터). 로그인한 상태면 대시보드로 바로 간다 */}
          <Link className={s.admin} to="/admin/login">
            운영진 로그인
          </Link>
        </div>
      </div>
    </footer>
  )
}
