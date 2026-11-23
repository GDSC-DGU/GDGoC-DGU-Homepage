package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** 지원폼 한 버전 (Firestore recruitments/{rid}/formVersions/{version}). */
public record ApplicationForm(int version, List<FormQuestion> questions) {

    public ApplicationForm {
        questions = List.copyOf(questions);
    }
}
