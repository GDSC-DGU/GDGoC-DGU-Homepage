package com.gdgocdgu.homepage.recruit.scoring;

/**
 * 지원서 AI 채점 작업을 큐에 등록한다. (F-RCT-004)
 * 지원서 제출(API-RCT-005)이 호출하고, 채점 실행(API-RCT-028)이 큐에서 꺼내 처리한다.
 *
 * <p>계약
 * <ul>
 *   <li>"지원서 {@code aid}를 기준 버전 {@code criteriaVersion}으로 채점하라"는 작업 한 건을 등록할 뿐이다.
 *       (API-RCT-028 요청 본문 {@code {aid, criteriaVersion}}과 같다.)
 *       채점하지 않고, {@code scoring.status}를 바꾸지 않으며, 결과를 기다리지 않는다.</li>
 *   <li>지원서 트랜잭션이 커밋된 뒤에 정확히 한 번 호출한다. 트랜잭션 안에서 부르면 재시도 때 작업이 중복되거나,
 *       롤백됐는데 작업만 남을 수 있다. {@code criteriaVersion}에는 모집의 {@code currentCriteriaVersion}을 넣고,
 *       이 값은 {@code applications/{aid}.scoring.criteriaVersion}에 저장한 값과 같아야 한다.</li>
 *   <li>호출한 쪽으로 예외를 던지지 않는다. 등록에 실패하면 로그만 남기고, PENDING에 멈춘 지원서는
 *       API-RCT-031이 다시 큐에 넣는다. 그래서 호출하는 쪽(RCT-005)은 try/catch 없이 그대로 201을 돌려주면 된다.</li>
 * </ul>
 *
 * <p>구현
 * <ul>
 *   <li>{@link LoggingScoringTaskQueue}: 로그만 남긴다. local에서 쓴다.</li>
 *   <li>{@link CloudTasksScoringTaskQueue}: Cloud Tasks 큐에 등록한다. dev · prod에서 쓴다.</li>
 * </ul>
 */
public interface ScoringTaskQueue {

    /**
     * 채점 작업을 등록한다. 어떤 입력에도, 등록에 실패해도 예외를 던지지 않는다.
     *
     * @param aid             채점할 지원서 ID
     * @param criteriaVersion 채점에 쓸 기준 버전 (1 이상)
     */
    void enqueue(String aid, int criteriaVersion);
}
