package com.gdgocdgu.homepage.recruit;

import java.util.Optional;

public interface FormVersionRepository {

    Optional<ApplicationForm> find(String rid, int version);
}
