#!/usr/bin/env node
// RCT(모집 · 지원) 테스트 데이터를 dev Firestore 또는 로컬 에뮬레이터에 넣고 지웁니다.
// 의존성 없이 Node 18+의 fetch와 Firestore REST API를 씁니다.
//
//   node scripts/seed/rct-dev.mjs seed  [--project <id>] [--cohort <n>] [--force]
//   node scripts/seed/rct-dev.mjs clean [--project <id>] [--cohort <n>]
//
// - FIRESTORE_EMULATOR_HOST가 있으면 에뮬레이터(기본 프로젝트 demo-gdgoc)에 씁니다.
// - 없으면 --project가 필요하고, dev(dev-gdgoc-dgu-homepage)만 허용합니다. 운영 프로젝트는 거부합니다.
//   토큰은 GOOGLE_OAUTH_ACCESS_TOKEN 또는 `gcloud auth print-access-token`으로 얻습니다.
// - 가짜 데이터만 씁니다. 채점 기준(guide)도 형식만 같은 예시입니다.

import { execFileSync } from "node:child_process";

const DEV_PROJECT = "dev-gdgoc-dgu-homepage";
const DEFAULT_COHORT = 900;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command: command === "-h" || command === "--help" ? "help" : command,
    force: false,
    cohort: DEFAULT_COHORT,
    project: undefined,
  };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--force") options.force = true;
    else if (arg === "--project") options.project = rest[++i];
    else if (arg === "--cohort") options.cohort = Number(rest[++i]);
    else if (arg === "-h" || arg === "--help") options.command = "help";
    else fail(`알 수 없는 옵션: ${arg}`);
  }
  if (!Number.isInteger(options.cohort) || options.cohort < 1) fail("--cohort는 1 이상의 정수여야 합니다.");
  return options;
}

function fail(message) {
  console.error(`오류: ${message}`);
  process.exit(1);
}

function usage() {
  console.log(`사용법:
  node scripts/seed/rct-dev.mjs seed  [--project <id>] [--cohort <n>] [--force]
  node scripts/seed/rct-dev.mjs clean [--project <id>] [--cohort <n>]

  seed   테스트 모집 회차(rct_<cohort>, 기본 rct_${DEFAULT_COHORT})와 지원폼 · 평가 기준 버전 1을 만듭니다.
         이미 있으면 멈추고, --force면 덮어씁니다.
  clean  그 회차와 지원폼 · 평가 기준 · 중복 방지 키, 그 회차로 제출된 지원서를 모두 지웁니다.

  에뮬레이터: FIRESTORE_EMULATOR_HOST=localhost:8180 을 지정하면 demo-gdgoc에 씁니다.
  dev: --project ${DEV_PROJECT}, 토큰은 GOOGLE_OAUTH_ACCESS_TOKEN 또는 gcloud에서 얻습니다.`);
}

function resolveTarget(options) {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (emulatorHost) {
    const project = options.project ?? "demo-gdgoc";
    return { project, base: `http://${emulatorHost}/v1`, token: "owner", label: `에뮬레이터 ${emulatorHost} (${project})` };
  }
  if (!options.project) fail(`--project가 필요합니다. dev는 --project ${DEV_PROJECT}`);
  if (options.project !== DEV_PROJECT) {
    fail(`${options.project}에는 쓸 수 없습니다. 이 스크립트는 dev(${DEV_PROJECT})와 에뮬레이터만 지원합니다.`);
  }
  return { project: options.project, base: "https://firestore.googleapis.com/v1", token: accessToken(), label: `dev (${options.project})` };
}

function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN.trim();
  try {
    return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8", shell: process.platform === "win32" }).trim();
  } catch {
    fail("접근 토큰을 얻지 못했습니다. `gcloud auth login` 후 다시 실행하거나 GOOGLE_OAUTH_ACCESS_TOKEN을 지정하세요.");
  }
}

// ---- Firestore REST ----

function toValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: value.length ? { values: value.map(toValue) } : {} };
  return { mapValue: { fields: toFields(value) } };
}

function toFields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, toValue(value)]));
}

function client(target) {
  const root = `${target.base}/projects/${target.project}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${target.token}`, "Content-Type": "application/json" };

  async function call(method, url, body) {
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (method === "GET" && response.status === 404) return null;
    if (!response.ok) {
      // 응답 본문에는 문서 내용이 없고 오류 설명만 있다.
      fail(`${method} ${url.replace(root, "")} 실패: HTTP ${response.status} ${await response.text()}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  return {
    exists: async (path) => (await call("GET", `${root}/${path}?mask.fieldPaths=_idOnly`)) !== null,
    set: (path, data) => call("PATCH", `${root}/${path}`, { fields: toFields(data) }),
    remove: (path) => call("DELETE", `${root}/${path}`),
    async listIds(collectionPath) {
      const ids = [];
      let pageToken;
      do {
        const query = new URLSearchParams({ pageSize: "300", "mask.fieldPaths": "_idOnly" });
        if (pageToken) query.set("pageToken", pageToken);
        const page = await call("GET", `${root}/${collectionPath}?${query}`);
        for (const doc of page?.documents ?? []) ids.push(doc.name.split("/").pop());
        pageToken = page?.nextPageToken;
      } while (pageToken);
      return ids;
    },
    async idsWhereEqual(collectionId, field, value) {
      const result = await call("POST", `${root}:runQuery`, {
        structuredQuery: {
          from: [{ collectionId }],
          where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: toValue(value) } },
          select: { fields: [{ fieldPath: "__name__" }] },
        },
      });
      return result.filter((row) => row.document).map((row) => row.document.name.split("/").pop());
    },
  };
}

// ---- 테스트 데이터 (가짜) ----

function testData(cohort, now) {
  const rid = `rct_${cohort}`;
  const questions = [
    { questionId: "q1", type: "LONG_TEXT", title: "[테스트] 지원 동기를 적어주세요.", description: "1000자 이내", required: true, maxLength: 1000, options: [], trackOnly: [] },
    { questionId: "q2", type: "LONG_TEXT", title: "[테스트] 함께 일했던 경험을 적어주세요.", description: null, required: true, maxLength: 1000, options: [], trackOnly: [] },
    { questionId: "q3", type: "URL", title: "[테스트] 포트폴리오 링크", description: "선택", required: false, maxLength: 2048, options: [], trackOnly: [] },
    { questionId: "q4", type: "SINGLE_CHOICE", title: "[테스트] 학년", description: null, required: true, maxLength: null, options: ["1학년", "2학년", "3학년", "4학년"], trackOnly: [] },
    { questionId: "q5", type: "MULTI_CHOICE", title: "[테스트] 관심 분야", description: "여러 개 선택", required: false, maxLength: null, options: ["웹", "서버", "AI", "모바일"], trackOnly: [] },
    { questionId: "q6", type: "SHORT_TEXT", title: "[테스트] BE 트랙 전용: 써 본 프레임워크", description: null, required: false, maxLength: 100, options: [], trackOnly: ["BE"] },
  ];
  const criteriaItems = [
    { itemId: "motivation", name: "[테스트] 지원 동기", questionIds: ["q1"], guide: "형식 예시입니다. 지원 동기가 구체적인지 봅니다.", weight: 60 },
    { itemId: "collaboration", name: "[테스트] 협업 경험", questionIds: ["q2"], guide: "형식 예시입니다. 협업 경험이 구체적인지 봅니다.", weight: 40 },
  ];
  const stage = { confirmed: false, confirmedAt: null, confirmedBy: null, unlockedReason: null };
  return {
    rid,
    recruitment: {
      cohort,
      title: `[테스트] GDGoC DGU ${cohort}기 모집`,
      status: "OPEN",
      closedManually: false,
      applyStartAt: new Date(now.getTime() - DAY_MS),
      applyEndAt: new Date(now.getTime() + 14 * DAY_MS),
      tracks: ["BE", "FE", "AI", "Mobile"],
      noticeMarkdown: "## 테스트 모집\n\ndev 테스트용 가짜 회차입니다. 실제 모집이 아닙니다.",
      posterFileId: null,
      latestFormVersion: 1,
      publishedFormVersion: 1,
      currentCriteriaVersion: 1,
      stages: { DOCUMENT: stage, INTERVIEW: stage },
      membersRegistered: false,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed-script",
      updatedBy: "seed-script",
    },
    form: {
      version: 1,
      status: "PUBLISHED",
      questions,
      updatedAt: now,
      updatedBy: "seed-script",
      updatedByName: "시드 스크립트",
      publishedAt: now,
      publishedBy: "seed-script",
    },
    criteria: { version: 1, items: criteriaItems, createdAt: now, createdBy: "seed-script" },
  };
}

// ---- 명령 ----

async function seed(db, options) {
  const data = testData(options.cohort, new Date());
  const recruitmentPath = `recruitments/${data.rid}`;
  if (!options.force && (await db.exists(recruitmentPath))) {
    fail(`${recruitmentPath}가 이미 있습니다. 덮어쓰려면 --force, 지우려면 clean을 쓰세요.`);
  }
  await db.set(`${recruitmentPath}/formVersions/1`, data.form);
  await db.set(`${recruitmentPath}/criteriaVersions/1`, data.criteria);
  // 회차는 마지막에 만든다. 중간에 실패해도 "게시됐는데 폼이 없는" 회차가 공개되지 않는다.
  await db.set(recruitmentPath, data.recruitment);
  console.log(`만들었습니다: ${recruitmentPath} (OPEN, ${data.recruitment.applyEndAt.toISOString()}까지), 폼 v1, 평가 기준 v1`);
  console.log("주의: 지원 시작일이 가장 늦은 공개 회차라 RCT-001 현재 모집으로 보입니다. 테스트가 끝나면 clean을 실행하세요.");
}

async function clean(db, options) {
  const rid = `rct_${options.cohort}`;
  const recruitmentPath = `recruitments/${rid}`;
  // 회차부터 지워 더 이상 공개 · 접수되지 않게 한 뒤 나머지를 지운다.
  await db.remove(recruitmentPath);
  const applicationIds = await db.idsWhereEqual("applications", "rid", rid);
  for (const aid of applicationIds) await db.remove(`applications/${aid}`);
  let keyCount = 0;
  for (const sub of ["formVersions", "criteriaVersions", "applicationKeys"]) {
    const ids = await db.listIds(`${recruitmentPath}/${sub}`);
    for (const id of ids) await db.remove(`${recruitmentPath}/${sub}/${id}`);
    if (sub === "applicationKeys") keyCount = ids.length;
  }
  console.log(`지웠습니다: ${recruitmentPath}, 지원서 ${applicationIds.length}건, 중복 방지 키 ${keyCount}개`);
}

const options = parseArgs(process.argv.slice(2));
if (options.command === "help" || !options.command) {
  usage();
  process.exit(options.command ? 0 : 1);
}
if (!["seed", "clean"].includes(options.command)) fail(`알 수 없는 명령: ${options.command}`);

const target = resolveTarget(options);
console.log(`대상: ${target.label}`);
const db = client(target);
await (options.command === "seed" ? seed(db, options) : clean(db, options));
