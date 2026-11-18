package com.gdgocdgu.homepage.auth;

record LoginMember(String userId, String name, String role, boolean active, long authVersion) {
}
