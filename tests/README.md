# TaskFlow AI automated tests

## Safety model

The main command runs existing backend unit tests, read-only production smoke checks, and isolated API/browser suites. Data-changing suites are skipped unless a dedicated test database is explicitly configured. They never use the production API or a production database.

Set all three variables in your local shell before running mutating integration/browser tests:

- TASKFLOW_TEST_MONGODB_URI: connection URL for a separate test database
- TASKFLOW_TEST_DATABASE_NAME: database name in the URL; it must exactly match and include a distinct test segment, such as taskflow_qa_test
- TASKFLOW_ALLOW_TEST_DATA=I_UNDERSTAND_TEST_DB_ONLY: explicit opt-in to disposable writes

### Provision a dedicated MongoDB Atlas test database

1. In Atlas, create a separate QA project/cluster (recommended) or a database named taskflow_qa_test that is distinct from the production database.
2. Under Database Access, create a dedicated QA database user. Grant readWrite only on taskflow_qa_test; do not reuse the production application user.
3. Under Network Access, allowlist only the current development machine's public IP. Do not use an allow-from-anywhere rule.
4. In the cluster's Connect flow, choose Drivers and copy the application connection string. Replace its database path with taskflow_qa_test, and URL-encode any reserved characters in the QA user's password.
5. In PowerShell, set the three TASKFLOW variables in the example below. Keep the URI only in your local shell or secret manager; never commit it or paste it into logs/chat.
6. Confirm that TASKFLOW_TEST_DATABASE_NAME exactly equals the database path in the URI and contains the distinct test segment. Then run npm test.

Atlas restricts cluster network connections to allowlisted addresses and supports database-scoped user permissions. See the official guides for [database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/) and [IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

If any safety setting is partial or does not match, the Playwright configuration fails closed. The test launcher overrides the child API process database URL with this explicit test URL, uses a run-local JWT secret, and removes AI provider credentials unless the explicit AI opt-in is enabled. Cleanup filters on generated test IDs/emails only. Do not point the test configuration at production.

PowerShell example after provisioning a separate test database:

    $env:TASKFLOW_TEST_MONGODB_URI = "mongodb+srv://<test-user>:<test-password>@<test-cluster>/<taskflow_qa_test>"
    $env:TASKFLOW_TEST_DATABASE_NAME = "taskflow_qa_test"
    $env:TASKFLOW_ALLOW_TEST_DATA = "I_UNDERSTAND_TEST_DB_ONLY"
    npm test

Replace the placeholders with the dedicated QA cluster/user details; do not run those placeholder values. Do not use a production URI. The API/browser integration suites start a local API configured only with this test URI and perform writes solely to its named test database.

AI provider tests are skipped by default. TASKFLOW_ENABLE_AI_TESTS=true opts into one synthetic AI request; this can incur provider cost. AI credentials are not inherited by the test API unless you explicitly enable the AI test.

## Commands

- npm test — unit tests, read-only production smoke tests, and configured isolated API/browser tests; writes test-results/report.html and test-results/results.json
- npm run test:unit — existing Node test suite
- npm run test:api — isolated HTTP API integration tests
- npm run test:e2e — Playwright browser workflows
- npm run test:smoke — read-only production health/assets/anonymous-auth checks
- npm run test:report — open the combined HTML summary
- npx playwright install chromium — install the Playwright browser once

Smoke test targets can be overridden with TASKFLOW_PRODUCTION_FRONTEND and TASKFLOW_PRODUCTION_API. They never sign in, write data, or call AI. Browser traces are disabled because traces can retain passwords and bearer tokens; screenshots are captured on browser-test failures.

Without test database configuration, API and browser suites report skipped with the reason; unit and production smoke checks still run. Browser tests check registration, protected-route redirect, project/task creation, task persistence after refresh, comments empty state, logout, and principal team/reports/AI/settings routes. API tests cover registration, unauthenticated and invalid tokens, ownership boundaries, project/task/comment operations, search, dashboard, team, notifications, validation, and persistence.
