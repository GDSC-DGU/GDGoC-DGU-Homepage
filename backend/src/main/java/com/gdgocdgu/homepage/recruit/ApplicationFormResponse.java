package com.gdgocdgu.homepage.recruit;

import java.util.List;

/** API-RCT-002 응답 data. */
public record ApplicationFormResponse(String rid, int formVersion, List<FormQuestion> questions) {

    static ApplicationFormResponse of(String rid, ApplicationForm form) {
        return new ApplicationFormResponse(rid, form.version(), form.questions());
    }
}
