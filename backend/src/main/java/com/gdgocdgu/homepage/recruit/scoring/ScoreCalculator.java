package com.gdgocdgu.homepage.recruit.scoring;

import com.gdgocdgu.homepage.recruit.scoring.GradingClient.GradingResponse;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.CriteriaItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredItem;
import com.gdgocdgu.homepage.recruit.scoring.ScoringModels.ScoredResult;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 점수 계산과 AI 응답 검증.
 * 항목 점수 = level / 5 × weight 이고 항상 0.2의 배수다. 실수 오차를 피하려고
 * 0.1 단위 정수({@code level × weight × 2})로 계산한 뒤 10으로 나눠 소수 1자리로 저장한다.
 */
final class ScoreCalculator {

    private ScoreCalculator() {
    }

    /** 0.1 단위 정수 점수. */
    static int tenths(int level, int weight) {
        return level * weight * 2;
    }

    static double toScore(int tenths) {
        return tenths / 10.0;
    }

    /**
     * AI 응답이 요청한 항목을 빠짐없이, 중복 없이, level 1~5로 돌려줬는지 확인한다.
     * 어긋나면 AI 출력 오류로 보고 false.
     */
    static boolean isValid(List<CriteriaItem> items, GradingResponse response) {
        if (response == null || !response.success() || response.results() == null) {
            return false;
        }
        Set<String> expected = new HashSet<>();
        items.forEach(item -> expected.add(item.itemId()));
        Set<String> seen = new HashSet<>();
        for (GradingResponse.ItemResult result : response.results()) {
            if (result == null || result.level() < 1 || result.level() > 5
                    || !expected.contains(result.itemId()) || !seen.add(result.itemId())) {
                return false;
            }
        }
        return seen.size() == expected.size();
    }

    /** 검증을 통과한 응답으로 항목 점수와 총점을 계산한다. 항목 순서는 기준을 따른다. */
    static ScoredResult score(List<CriteriaItem> items, GradingResponse response) {
        Map<String, GradingResponse.ItemResult> byId = new HashMap<>();
        response.results().forEach(result -> byId.put(result.itemId(), result));

        List<ScoredItem> scored = new ArrayList<>();
        int totalTenths = 0;
        for (CriteriaItem item : items) {
            GradingResponse.ItemResult result = byId.get(item.itemId());
            int tenths = tenths(result.level(), item.weight());
            totalTenths += tenths;
            scored.add(new ScoredItem(item.itemId(), item.name(), result.level(), item.weight(),
                    toScore(tenths), result.reason()));
        }
        return new ScoredResult(scored, toScore(totalTenths), response.model(), response.promptVersion(),
                response.instructionIgnored());
    }
}
