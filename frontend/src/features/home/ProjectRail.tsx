import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Swiper as SwiperClass } from 'swiper'
import { A11y, Autoplay } from 'swiper/modules'
import { Swiper, SwiperSlide, type SwiperRef } from 'swiper/react'
import 'swiper/css'
import { PROJECTS, isPublicProject } from '@/content'
import { HOME_PROJECTS } from '@/content/home'
import { PROJECTS_STORY } from '@/content/story'
import { useProjects } from '@/data/queries'
import type { Project } from '@/domain/types'
import { assetUrl, isWorkImage, monogram } from '@/features/pages/projects/exhibit'
import { sheetSearch } from '@/features/pages/projects/sheetLink'
import { useReducedMotion } from '@/hooks/useMediaQuery'
import { HomeHead, MoreLink } from './HomeHead'
import { fill, projectCounts } from './homeData'
import { railImage, railProjects } from './landing'
import { Chevron, PlayPause } from './SlideControls'
import { aos } from './useReveal'
import s from './projectRail.module.css'

function RailCard({ p }: { p: Project }) {
  const img = railImage(p)
  const work = isWorkImage(img)
  return (
    <article className={s.item}>
      <div className={s.media} data-fit={work ? 'cover' : 'logo'}>
        {img ? (
          <img className={s.img} src={assetUrl(img.src)} alt={img.alt} width={img.width} height={img.height} loading="lazy" decoding="async" />
        ) : (
          <span className={s.mono} aria-hidden="true">
            {monogram(p.name)}
          </span>
        )}
      </div>
      <div className={s.body}>
        <p className={s.program}>{p.program}</p>
        <h3 className={s.name}>
          <Link className={s.link} to={{ pathname: '/archive', search: sheetSearch(p.id) }}>
            {p.name}
          </Link>
        </h3>
        {p.summary && <p className={s.summary}>{p.summary}</p>}
        <p className={`num ${s.year}`}>{p.generation ? `${p.year}, ${p.generation}기` : p.year}</p>
      </div>
    </article>
  )
}

/** 슈어소프트테크 진행 막대: (지금 몇 번째 + 1) / 전체 */
function progressOf(sw: SwiperClass, total: number): number {
  if (total <= 0) return 1
  const perView = typeof sw.params.slidesPerView === 'number' ? sw.params.slidesPerView : 1
  if (total <= perView) return 1
  const idx = sw.params.loop ? sw.realIndex : sw.activeIndex
  return Math.min(1, (idx + 1) / total)
}

/**
 * 3 팀 프로젝트 (슈어소프트테크 'Promotion Center'): 옅은 회색 면, 이름표 + 제목, 카드 줄, 아래 진행 막대 · 멈춤 · 이전 · 다음 · View More.
 * Swiper 를 그 사이트와 같은 설정으로: 4장 · 간격 30 (1300 이하 3장 · 25, 980 이하 2장 · 20, 680 이하 1.2장 · 15),
 * 0.6초, 4장보다 많으면 끝없이, 5초마다 저절로(만져도 계속). 카드를 누르면 아카이브의 자세히 보기 창.
 */
export function ProjectRail() {
  const { data } = useProjects()
  const list = (data ?? PROJECTS).filter(isPublicProject)
  const { done } = projectCounts(list)
  const shown = railProjects(list, HOME_PROJECTS.limit)
  const reduce = useReducedMotion()
  const ref = useRef<SwiperRef>(null)
  const [progress, setProgress] = useState(0)
  const [stopped, setStopped] = useState(false)
  const total = shown.length
  const auto = total > 4 && !reduce

  if (done === 0) return null
  const sync = (sw: SwiperClass) => setProgress(progressOf(sw, total))
  const toggle = () => {
    const sw = ref.current?.swiper
    if (!sw?.autoplay) return
    if (stopped) sw.autoplay.start()
    else sw.autoplay.stop()
    setStopped(!stopped)
  }
  return (
    <section id="projects" className={s.section} aria-labelledby="projects-title">
      <div className="container">
        <HomeHead id="projects-title" eng={HOME_PROJECTS.eng} title={fill(PROJECTS_STORY.title, { n: done })} />
        <div {...aos(300)}>
          <Swiper
            ref={ref}
            className={s.swiper}
            modules={[Autoplay, A11y]}
            slidesPerView={4}
            spaceBetween={30}
            speed={reduce ? 0 : 600}
            slidesPerGroup={1}
            loop={total > 4}
            grabCursor
            watchOverflow
            breakpoints={{
              0: { slidesPerView: 1.2, spaceBetween: 15 },
              681: { slidesPerView: 2, spaceBetween: 20 },
              981: { slidesPerView: 3, spaceBetween: 25 },
              1301: { slidesPerView: 4, spaceBetween: 30 },
            }}
            autoplay={auto ? { delay: 5000, disableOnInteraction: false } : false}
            a11y={{ prevSlideMessage: HOME_PROJECTS.prev, nextSlideMessage: HOME_PROJECTS.next }}
            onInit={sync}
            onSlideChangeTransitionEnd={sync}
            onResize={sync}
            onBreakpoint={sync}
          >
            {shown.map((p) => (
              <SwiperSlide key={p.id} className={s.slide}>
                <RailCard p={p} />
              </SwiperSlide>
            ))}
          </Swiper>
          <div className={s.controls}>
            <div className={s.bar} aria-hidden="true">
              <span className={s.barFill} style={{ ['--p' as string]: String(progress) }} />
            </div>
            {auto && (
              <button type="button" className={s.arrow} aria-pressed={stopped} aria-label={stopped ? HOME_PROJECTS.play : HOME_PROJECTS.pause} onClick={toggle}>
                <PlayPause paused={stopped} />
              </button>
            )}
            <button type="button" className={s.arrow} aria-label={HOME_PROJECTS.prev} onClick={() => ref.current?.swiper.slidePrev()}>
              <Chevron dir="prev" size={16} />
            </button>
            <button type="button" className={s.arrow} aria-label={HOME_PROJECTS.next} onClick={() => ref.current?.swiper.slideNext()}>
              <Chevron dir="next" size={16} />
            </button>
            <div className={s.more}>
              <MoreLink to="/archive">{HOME_PROJECTS.more}</MoreLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
