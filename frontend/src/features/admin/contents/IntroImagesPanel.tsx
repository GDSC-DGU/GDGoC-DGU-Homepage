import { useEffect, useRef, useState } from 'react'
import { INTRO_IMAGE_MAX, INTRO_IMAGE_MIN, moveItem } from '../data/contents/mockRepository'
import type { ContentsState, IntroImage } from '../data/contents/types'
import { errorMessage } from '../data/common/errors'
import { FILE_RULES } from '../data/common/fileRules'
import { useAdminRepos } from '../data/useAdminData'
import { AdminImage, Button, Panel, deleteConfirm, useConfirm, useToast } from '../ui'
import { IconErrorMark } from '../ui/icons'
import { ChangeLine, IconArrow, IconPlus } from './shared'
import { useFilePicker } from './useFilePicker'
import s from './contents.module.css'

/**
 * 홈 소개 이미지 (F-ACT-002~004): 홈 상단 슬라이드에 보이는 순서대로 카드.
 * - [이미지 추가]: JPG · PNG 5MB 이하, 최대 8장, 맨 뒤에 붙는다 (업로드 흉내 → 추가)
 * - 순서: 드래그 대신 [앞으로] · [뒤로] 버튼, 누르는 즉시 저장 (여러 번 눌러도 순서대로 저장되게 줄 세움)
 * - [삭제]: 확인 후 슬라이드에서 빠짐, 최소 1장은 남김 (마지막 1장은 버튼이 막히고 이유를 읽힌다)
 */
export function IntroImagesPanel({ data }: { data: ContentsState }) {
  const repos = useAdminRepos()
  const toast = useToast()
  const confirm = useConfirm()
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')

  // 순서 바꾸기: 화면은 바로 바꾸고(낙관적), 저장은 한 줄로 세워 차례대로 (늦게 끝난 요청이 새 순서를 덮지 않게)
  const [order, setOrder] = useState<string[] | null>(null)
  const chain = useRef(Promise.resolve())
  const inFlight = useRef(0)
  const byId = new Map(data.introImages.map((i) => [i.id, i]))
  const shownIds = order && order.length === data.introImages.length && order.every((id) => byId.has(id)) ? order : data.introImages.map((i) => i.id)
  const images = shownIds.map((id) => byId.get(id)!)
  // 마지막 저장까지 끝나고 새 목록을 받으면 화면 순서를 저장된 순서에 맡긴다
  // (저장이 끝난 순간이 아니라 새 목록이 온 뒤에: 옛 순서가 잠깐 보이지 않게)
  useEffect(() => {
    if (inFlight.current === 0) setOrder(null)
  }, [data.introImages])

  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const listRef = useRef<HTMLOListElement>(null)
  const refFor = (key: string) => (el: HTMLButtonElement | null) => {
    if (el) buttons.current.set(key, el)
    else buttons.current.delete(key)
  }

  const move = (index: number, to: number) => {
    const next = moveItem(shownIds, index, to)
    const id = shownIds[index]
    setOrder(next)
    setAnnounce(`${index + 1}번째 이미지를 ${to + 1}번째로 옮겼습니다. 홈 슬라이드 순서도 바뀝니다.`)
    // 옮긴 카드의 같은 버튼으로 초점 (끝에 닿아 그 버튼이 막히면 반대쪽 버튼)
    const dir = to < index ? 'prev' : 'next'
    const edge = (dir === 'prev' && to === 0) || (dir === 'next' && to === next.length - 1)
    requestAnimationFrame(() => buttons.current.get(`${id}:${edge ? (dir === 'prev' ? 'next' : 'prev') : dir}`)?.focus())
    inFlight.current++
    chain.current = chain.current
      .then(() => repos.contents.reorderIntroImages(next))
      .catch((e: unknown) => {
        toast.error(errorMessage(e))
        setOrder(null)
      })
      .finally(() => {
        inFlight.current--
      })
  }

  const add = async (file: File) => {
    setUploadError(null)
    setUploading(file.name)
    try {
      const ref = await repos.uploads.upload(file, 'introImage')
      await repos.contents.addIntroImage(ref.fileId)
      toast.success('소개 이미지를 추가했습니다. 홈 슬라이드 맨 뒤에 붙었습니다.')
    } catch (e) {
      setUploadError(errorMessage(e))
    } finally {
      setUploading(null)
    }
  }
  const picker = useFilePicker(FILE_RULES.introImage, (f) => void add(f), setUploadError)

  const remove = async (image: IntroImage, index: number) => {
    if (!(await confirm(deleteConfirm('이미지', 1, `${index + 1}번째 소개 이미지가 홈 슬라이드에서 빠지고, 이미지 파일도 함께 삭제됩니다.`)))) return
    setDeleting(image.id)
    try {
      await repos.contents.deleteIntroImage(image.id)
      toast.success('소개 이미지 1장을 삭제했습니다.')
      // 지운 카드의 버튼이 사라지므로 목록으로 초점
      listRef.current?.focus()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeleting(null)
    }
  }

  const full = data.introImages.length >= INTRO_IMAGE_MAX
  const last = data.introImages.length <= INTRO_IMAGE_MIN

  return (
    <Panel
      title="홈 소개 이미지"
      description={<ChangeLine stamp={data.changes.introImages} prefix={<>{`${data.introImages.length}/${INTRO_IMAGE_MAX}장 · `}</>} />}
      actions={
        <>
          <Button variant="secondary" busy={!!uploading} disabledReason={full ? `소개 이미지는 최대 ${INTRO_IMAGE_MAX}장까지 올릴 수 있습니다. 하나를 삭제한 뒤 추가해 주세요.` : undefined} onClick={picker.open}>
            <IconPlus />
            이미지 추가
          </Button>
          {picker.input}
        </>
      }
    >
      <p className={`${s.note} ${s.panelNote}`}>
        홈 상단 슬라이드에 이 순서대로 보입니다. JPG · PNG, 5MB 이하, 최대 {INTRO_IMAGE_MAX}장. 16:9 권장이며 다른 비율은 가운데를 기준으로 잘라 보입니다. 순서는 [앞으로] · [뒤로]를 누르는 즉시 저장됩니다.
      </p>
      {uploadError && (
        <p className={s.alert} role="alert">
          <IconErrorMark />
          {uploadError}
        </p>
      )}
      <p className="visually-hidden" role="status">
        {announce}
      </p>
      <ol ref={listRef} tabIndex={-1} className={s.images} aria-label={`홈 소개 이미지 ${images.length}장, 슬라이드 순서`}>
        {images.map((img, i) => (
          <li key={img.id} className={s.imageCard}>
            <span className={s.media}>
              <AdminImage src={img.url} alt="" />
              <span className={s.order} aria-hidden="true">
                {i + 1}
              </span>
            </span>
            <span className={s.imageName} title={img.alt}>
              <span className="visually-hidden">{i + 1}번째, </span>
              {img.alt}
            </span>
            <span className={s.imageActions}>
              <Button ref={refFor(`${img.id}:prev`)} variant="secondary" size="xs" disabled={i === 0} aria-label={`${i + 1}번째 이미지를 앞으로`} onClick={() => move(i, i - 1)}>
                <IconArrow dir="left" />
                앞으로
              </Button>
              <Button ref={refFor(`${img.id}:next`)} variant="secondary" size="xs" disabled={i === images.length - 1} aria-label={`${i + 1}번째 이미지를 뒤로`} onClick={() => move(i, i + 1)}>
                뒤로
                <IconArrow dir="right" />
              </Button>
              <Button
                variant="secondary"
                size="xs"
                busy={deleting === img.id}
                aria-label={`${i + 1}번째 이미지 삭제`}
                disabledReason={last ? '소개 이미지는 최소 1장은 남겨야 합니다.' : undefined}
                onClick={() => void remove(img, i)}
              >
                삭제
              </Button>
            </span>
          </li>
        ))}
        {uploading && (
          <li className={s.uploadingCard} role="status">
            <span className="num">{uploading}</span>
            올리는 중…
          </li>
        )}
      </ol>
    </Panel>
  )
}
