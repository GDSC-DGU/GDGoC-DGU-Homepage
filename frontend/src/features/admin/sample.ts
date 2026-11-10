import { PROTOTYPE } from '@/config/site'

/**
 * '예시 화면' 표시를 붙일지 (팀원 찾기의 TEAMS_SAMPLE 과 같은 규칙).
 * - 프로토타입 보기(개발 화면 · 테스트 · VITE_PROTOTYPE=true 빌드): false. 운영 중인 관리자 화면처럼 '예시' 표시 없이 보인다
 * - 프로토타입을 끈 공개 배포: true. 탭 제목 '(예시)' · 사이드바 '예시 화면 · 예시 데이터' · 로그인 화면의 예시 계정 안내가 붙는다
 * 데이터(게시판 · 사용자 · 모집 · 리뷰)는 두 경우 모두 공개 사이트와 같은 자료에서 만든다 (data 아래 구역마다 seed.ts).
 */
export const ADMIN_SAMPLE = !PROTOTYPE

/** 예시 화면에서만 붙이는 문구 (프로토타입 보기에서는 빈 글자) */
export const sampleOnly = (text: string): string => (ADMIN_SAMPLE ? text : '')
