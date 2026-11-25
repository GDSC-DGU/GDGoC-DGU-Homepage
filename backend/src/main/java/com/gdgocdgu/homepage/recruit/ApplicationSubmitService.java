package com.gdgocdgu.homepage.recruit;

import com.gdgocdgu.homepage.common.error.ApiException;
import com.gdgocdgu.homepage.common.time.KstTime;
import com.gdgocdgu.homepage.recruit.SubmitResult.Rejected;
import com.gdgocdgu.homepage.recruit.SubmitResult.Submitted;
import com.gdgocdgu.homepage.recruit.scoring.ScoringTaskQueue;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class ApplicationSubmitService {

    private static final String AID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
    private static final int AID_RANDOM_LENGTH = 12;

    private final SecureRandom random = new SecureRandom();
    private final RecruitmentRepository recruitmentRepository;
    private final FormVersionRepository formVersionRepository;
    private final ApplicationSubmitRepository applicationSubmitRepository;
    private final ScoringTaskQueue scoringTaskQueue;
    private final ApplicationKeyGenerator applicationKeyGenerator;
    private final Clock clock;

    public ApplicationSubmitService(RecruitmentRepository recruitmentRepository,
            FormVersionRepository formVersionRepository, ApplicationSubmitRepository applicationSubmitRepository,
            ScoringTaskQueue scoringTaskQueue, ApplicationKeyGenerator applicationKeyGenerator, Clock clock) {
        this.recruitmentRepository = recruitmentRepository;
        this.formVersionRepository = formVersionRepository;
        this.applicationSubmitRepository = applicationSubmitRepository;
        this.scoringTaskQueue = scoringTaskQueue;
        this.applicationKeyGenerator = applicationKeyGenerator;
        this.clock = clock;
    }

    /**
     * API-RCT-005. 접수 가능 · 폼 버전을 먼저 확인하고 답변을 검증한 뒤, 트랜잭션에서 다시 확인하며 저장한다.
     * 채점 작업은 커밋된 뒤에 한 번 등록한다. 등록 실패는 큐가 삼키고 RCT-031이 다시 넣으므로 201을 그대로 돌려준다.
     */
    public SubmitApplicationResponse submit(String rid, SubmitApplicationRequest request) {
        if (request == null || request.formVersion() == null) {
            throw ApplicationValidator.invalid();
        }
        Instant now = clock.instant();
        Recruitment recruitment = recruitmentRepository.findById(rid)
                .filter(found -> found.applyState(now).canApply())
                .orElseThrow(() -> new ApiException(RecruitErrorCode.RECRUITMENT_CLOSED));
        if (!request.formVersion().equals(recruitment.publishedFormVersion())) {
            throw new ApiException(RecruitErrorCode.FORM_CHANGED);
        }
        int formVersion = recruitment.publishedFormVersion();
        ApplicationForm form = formVersionRepository.find(rid, formVersion)
                .orElseThrow(() -> new IllegalStateException(
                        "recruitments/" + rid + " 의 게시 폼 버전 " + formVersion + " 문서가 없습니다."));
        ApplicationSubmission submission = ApplicationValidator.validate(request, recruitment, form);

        NewApplication application = new NewApplication(newAid(), rid, submission,
                applicationKeyGenerator.studentIdKey(submission.studentId()),
                applicationKeyGenerator.emailKey(submission.email()), now);
        SubmitResult result = applicationSubmitRepository.submit(application);
        if (result instanceof Rejected rejected) {
            throw new ApiException(rejected.code());
        }
        scoringTaskQueue.enqueue(application.aid(), ((Submitted) result).criteriaVersion());
        return new SubmitApplicationResponse(application.aid(), KstTime.format(now));
    }

    private String newAid() {
        StringBuilder aid = new StringBuilder("a_");
        for (int i = 0; i < AID_RANDOM_LENGTH; i++) {
            aid.append(AID_CHARS.charAt(random.nextInt(AID_CHARS.length())));
        }
        return aid.toString();
    }
}
