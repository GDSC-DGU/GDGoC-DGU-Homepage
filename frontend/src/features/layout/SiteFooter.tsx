import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SITE } from '@/config/site'
import { CHAPTER } from '@/content'
import { BRAND_PATHS } from './brandPaths'
import s from './layout.module.css'

interface Channel {
  id: string
  /** 읽기 프로그램 · 툴팁 이름 */
  label: string
  href: string
  icon: ReactNode
  /** 새 창으로 여는 바깥 주소 (메일은 아님) */
  external: boolean
}

const brandIcon = (path: string) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={s.channelFill}>
    <path d={path} />
  </svg>
)

const mailIcon = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={s.channelLine}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M4 7.5l8 6 8-6" />
  </svg>
)

/** '채널 바로가기': 주소가 확인된 채널만 (src/content/chapter.json, config/site.ts). 디스코드는 주소를 받으면 보인다 */
const CHANNELS: Channel[] = (
  [
    CHAPTER.email ? { id: 'mail', label: `이메일 ${CHAPTER.email}`, href: `mailto:${CHAPTER.email}`, icon: mailIcon, external: false } : null,
    { id: 'instagram', label: `인스타그램 ${SITE.links.instagramHandle}`, href: SITE.links.instagram, icon: brandIcon(BRAND_PATHS.instagram), external: true },
    CHAPTER.github ? { id: 'github', label: 'GitHub', href: CHAPTER.github, icon: brandIcon(BRAND_PATHS.github), external: true } : null,
    SITE.links.youtube ? { id: 'youtube', label: '유튜브', href: SITE.links.youtube, icon: brandIcon(BRAND_PATHS.youtube), external: true } : null,
    SITE.links.discord ? { id: 'discord', label: '디스코드', href: SITE.links.discord, icon: brandIcon(BRAND_PATHS.discord), external: true } : null,
  ] as (Channel | null)[]
).filter((c): c is Channel => c !== null)

/**
 * 꼬리말 (4기 Figma 시안 2026-11): 옅은 회색 띠.
 * 왼쪽 이름 · 주소 · 개인정보 처리방침 · 저작권 | 오른쪽 '채널 바로가기' 아이콘 줄 (메일 · 인스타그램 · GitHub · 유튜브 · 디스코드).
 * 관리자 로그인 링크는 두지 않는다 (F-COM-002: 머리말에서 로그인한 뒤 '관리자 페이지' 버튼).
 */
export function SiteFooter() {
  return (
    <footer className={`on-dark ${s.footer}`}>
      <div className={`container ${s.footerGrid}`}>
        <div className={s.footerInfo}>
          <p className={s.footerBrand} lang="en">
            GDGoC Dongguk
          </p>
          <p className={s.footerAddress}>{SITE.address}</p>
          {/* F-COM-002 · 005: 개인정보 처리방침은 모든 화면 아래에서 갈 수 있게 (Google 로그인 동의 화면에도 같은 주소) */}
          <p className={s.footerLinks}>
            <Link className={s.footerPolicy} to="/privacy">
              개인정보 처리방침
            </Link>
          </p>
          <p className={s.footerCopy} lang="en">
            Copyright © <span className="num">2026</span> {SITE.fullName}. All rights reserved.
          </p>
        </div>

        <nav className={s.channels} aria-labelledby="footer-channels">
          <h2 id="footer-channels" className={s.channelsTitle}>
            채널 바로가기
          </h2>
          <ul className={s.channelList}>
            {CHANNELS.map((c) => (
              <li key={c.id}>
                <a className={s.channel} href={c.href} title={c.label} {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                  {c.icon}
                  <span className="visually-hidden">
                    {c.label}
                    {c.external && ' (새 창)'}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

      </div>
    </footer>
  )
}
