# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## 2.3.57 primary dashboard request ownership (2026-09-07)

Current local verification record; check remote CI against the published commit.

- Ten primary GET loaders now check workspace, session, generation, and latest-request identity before changing dashboard data or errors: mission control, operations brief, jobs, notification health, connectors, work signals, reports, forecasts, enhancements, and the operations ledger. Lazy-module error continuations also recheck ownership. No provider authority, route, database model, or dependency was added.
- The initial read-ownership regression suite reproduced 52 failures among 54 cases. The final two new suites pass 62 tests, including late successes/failures, session/generation changes, same-context supersession, delayed module errors, navigation focus, shared approvals-module arrival, and reset using all six real cached view renderers. The existing enhancement and approval source-contract tests were adjusted for the stronger guard and indentation; their behavioral assertions remain intact.
- Workspace adoption clears cached dashboard records and rendered evidence, aborts pending connector/enhancement reads, clears a pending connector-search timer, and reuses already-loaded modules. An independent review reproduced and then confirmed fixes for a blank approvals view when its module arrived after the new workspace data, and stale enhancement-area options after reset. The final narrow re-review reported no remaining findings in those two fixes and passed 62 tests.
- `npm run check:ci` passed lint, 180 route authorization contracts, 149 suites/1,277 tests, and all five recommendation scenarios. The full dependency audit reported zero known vulnerabilities. Tests completed before the metadata-only version bump from 2.3.56 to 2.3.57. The paginated GitHub open-PR inventory was empty before publication.
- The unsigned Windows 2.3.57 installer built successfully (109,510,487 bytes); packaged `public/app.js` matches source byte for byte. The five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, normal close, main exit code zero, settled process inventory, no remaining processes, and port release. Four processes sampled 378.5 MB working set, 340.5 MB private memory, and 1.375 cumulative CPU seconds. This short shared-machine sample is not an isolated performance comparison, signed release, or clean-machine installation acceptance.
- Browser verification used actual application scripts against a loopback read-only synthetic API, without MongoDB initialization, workers, provider writes, tunnels, or real accounts. A report in workspace A was refreshed with its response delayed 15 seconds, then the operator switched to B. The old report cleared immediately; B's report remained after A's late completion. DOM checks and screenshots showed a nonblank view and no horizontal document overflow at measured widths of 2,560 and 480 CSS pixels; the subsequent Workspaces view measured 449 pixels without overflow. No warning/error console entries were recorded. Host scaling differs from requested viewport dimensions; this is not exact-device or authenticated production acceptance. The temporary tab/server were closed and the size override reset.
- The browser check also confirmed a known remaining usability gap: switching from Reports leaves the workspace selector disabled with a current-workspace fallback until Workspaces reloads the catalog. That navigation restored both synthetic workspace options. Already-open scenario POSTs, mutation forms, detail reads, and invitation/session transitions are not covered by the new GET guards. Cross-user isolation remains partial. Existing network/server work is not universally canceled, and no comparative performance or live provider/ngrok/HAI acceptance is claimed.

## 2.3.56 workspace administration request ownership (2026-09-07)

Historical local verification record; check remote CI against its published commit.

- Eleven initial regressions exposed administration chains continuing after workspace/session changes, stale security/feature/history updates, and retention-button ownership errors. The affected reads now check workspace, session, generation, and latest-request identity before state changes or subsequent administration requests. Integrity scans also check session and generation. These changes add no provider authority, route, database model, or dependency.
- Final `npm run check:ci` passed lint, all 180 route authorization contracts, 147 suites/1,215 tests, and all five recommendation scenarios. The full dependency audit reported zero known vulnerabilities. GitHub's paginated open-pull-request inventory was empty before publication. No new live provider, MongoDB, ngrok, or HAI acceptance was performed locally for this frontend-only correction; remote integration checks must be verified on the published commit.
- Canonical workspace selection now precedes dependent administration reads. Adoption clears old administration records and permission indicators immediately, reloads security when administration resolves a different workspace, and tolerates denied browser storage. The current workspace remains in the selector even if absent from the bounded catalog page. View loading shares only requests in the same context; an old completion cannot mark the new view loaded or delete its pending request. Superseded top-level refreshes stop before further view loading.
- Review reproduced stale permission context after automatic adoption, partial adoption on storage failure, and catalog errors erasing independently refreshed history. These were corrected. Administration now uses the same latest-history reader as history filters, and outer catalog/membership failures no longer erase independent policy/history results. Final independent review found no remaining material introduced issues within these flows and passed its then-current 18 focused tests. Three later tests cover same-context request sharing and refresh-stage cancellation, bringing the focused file to 21 passing cases.
- Browser verification used the actual application scripts and renderer against a loopback read-only synthetic API fixture, not real accounts or MongoDB. The path was Workspaces, select A, refresh with a delayed A response, then select B. Old rows and permission controls cleared during transition; the final administration view showed B and its synthetic user, not A's user. The page was nonblank, showed no framework overlay, and produced no warning/error console entries. Screenshot and DOM checks found no document overflow at measured widths of 2,560 and 449 CSS pixels; requested viewport dimensions differed because of browser/host scaling. This is not exact-device or authenticated production acceptance. The browser size override was reset and the temporary tab and server were closed.
- The unsigned Windows 2.3.56 installer built successfully, and its packaged `public/app.js` matches source byte for byte. The five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, normal close, main exit code zero, settled process inventory, no remaining processes, and port release. Four processes sampled 367.6 MB working set, 329 MB private memory, and 1.812 cumulative CPU seconds. This is a point-in-time sample, not an isolated performance comparison or signed clean-machine installation acceptance.
- Stopping superseded administration chains avoids unnecessary subsequent requests, while same-context repeated navigation still shares work. Existing requests are not universally aborted at the network/server level. Other dashboard loaders and already-open mutation forms still need context-transition verification, so the end-to-end cross-user isolation matrix entry is now explicitly partial. Live provider/ngrok/HAI acceptance, extended-outage recovery, and the full goal remain open.

## 2.3.55 authenticated report downloads (2026-09-07)

Historical local verification record. Remote CI must be checked against its exact commit.

- Report downloads now use the existing authenticated, versioned API helper with the selected workspace instead of an unauthenticated anchor request. Markdown and PDF retain their existing backend permissions. Duplicate clicks share one request; pending controls update without replacing their DOM nodes. Completed responses from another workspace or session are discarded, and explicit workspace/session transitions cancel pending downloads.
- Requests have a 30-second client deadline, a five-MiB streamed file limit, MIME and empty-body validation, sanitized filenames, and deferred object-URL cleanup. Independent review found unbounded error-body parsing; a reproduced regression was fixed with a 32-KiB streamed error limit and 500-character message limit. Oversized responses are rejected without saving a partial report. These bounds do not establish production-volume throughput or cancel server-side generation work.
- Final `npm run check:ci` passed lint, 180 route authorization contracts, 146 suites/1,194 tests, and all five recommendation scenarios. The full dependency audit reported zero known vulnerabilities. The two focused UI suites pass 18 tests covering authenticated downloads, context changes, retries, duplicate clicks, timeout, bounded errors, and stable localized progress controls. Independent final review found no remaining material issues; it did not independently rerun the suites.
- `npm run verify:hai-http` passed 25 checks against a fresh randomly named loopback MongoDB database, including all four report types in both formats, 401/403 permission boundaries, credential-owned workspace isolation, attachment metadata, PDF signatures, and Markdown content. All eight report responses were nonempty and below the client limit. No approvals or Trello attempts were created; provider writes remained disabled. The temporary database and HTTP server were removed.
- An actual browser session against the explicit local demo downloaded `weekly-status.md` (1,572 bytes) and `weekly-status.pdf` (2,908 bytes). The Markdown contained demo content and the PDF had its expected signature; the browser reported no warning/error console entries. Browser download-event waiting timed out for Markdown, so completion was verified from the actual newly written file instead. This is not PDF visual acceptance or a full authenticated live-workspace browser journey. The temporary browser tab and loopback server were closed.
- The unsigned Windows 2.3.55 installer built successfully. Both changed runtime files match the packaged archive byte for byte. The five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, main exit code zero, settled process inventory, no remaining processes, and port release. Four processes sampled 373.8 MB working set, 334.3 MB private memory, and 1.688 cumulative CPU seconds. These are point-in-time observations, not an isolated performance comparison or signed clean-machine installation acceptance.
- The broader cross-view workspace request-coordination audit remains incomplete; the report-specific guards do not certify every dashboard view. Live provider/ngrok/HAI acceptance, extended-outage recovery, signed clean-machine Windows acceptance, and the full production goal remain open. No provider permissions, approval policy, dependencies, or database schema were changed for this fix.

## 2.3.54 recovery evidence visibility (2026-09-07)

Historical local verification record. Remote CI must be checked against its exact commit.

- Data Integrity now reports pending worker-response claims and quarantined worker webhooks after 15 minutes, plus invalid active approval references. Evidence is limited to record identifiers and small current/expected projections. These categories never enter the derived-state repair map; neither provider actions nor recovery writes were added.
- Independent review found healthy approval records and earlier review categories could hide later findings. Allowlisted category selection with record-ID continuation makes every category reachable without unbounded scans. Category-specific requests skip unrelated queries; approval lookup is one deduplicated, workspace-scoped batch. Three supporting indexes and five-second server query limits were added. These changes bound work but are not a measured throughput or steady-state performance improvement.
- A final reviewer reproduced an in-flight workspace-switch race. Three deferred-response tests failed before correction and pass with request/workspace guards. Newer category/workspace requests supersede earlier results and failures. Final focused review found that race resolved; the reviewer did not rerun the suites.
- `npm run check:ci` passed lint, 180 route authorization contracts, 145 suites/1,182 tests, and all five recommendation scenarios. The full dependency audit reported zero known vulnerabilities. The three focused integrity suites pass 25 tests.
- The real-Mongo ledger verifier still passes its eight acknowledgement scenarios and now verifies authenticated integrity HTTP responses, 401/400/403 boundaries, workspace-header isolation, recent/aged recovery records, category continuation beyond healthy approvals, skipped repairs, and unchanged recovery evidence. Its temporary HTTP server and randomly named synthetic database were removed. There were zero provider writes or additional action attempts beyond the two existing synthetic fixtures.
- Browser checks used the real integrity renderer and stylesheet with a synthetic component fixture, separately from the real HTTP verifier. Expanded evidence and category/next callbacks worked; Dutch component checks showed no document overflow at the browser's measured minimum width of 480 CSS pixels. This is not a complete authenticated browser journey or 390-pixel device acceptance. The temporary browser tab and loopback fixture server were closed.
- Approval-reference integrity is not approval expiry/payload-freshness certification. Automatic extended-outage/process-loss reconciliation, live provider/ngrok/HAI acceptance, signed clean-machine Windows acceptance, and the full goal remain open.
- The separate production release-environment preflight refused this development environment because `NODE_ENV` was not `production`. No deployment secrets or environment settings were changed to bypass that gate; this run does not certify production configuration.
- The final unsigned Windows 2.3.54 installer built successfully; all seven changed runtime files matched the packaged archive byte for byte. The five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, normal close, main exit code zero, settled process inventory, no remaining processes, and port release. Four processes sampled 373.5 MB working set, 335.6 MB private memory, and 1.812 cumulative CPU seconds. This is a point-in-time sample, not an isolated performance comparison. GitHub's paginated open-pull-request inventory was empty before publication.

## 2.3.53 uncertain ledger acknowledgements (2026-09-06)

Historical local verification record. Remote CI must be checked against its exact commit.

- Identified a committed-write/lost-acknowledgement failure path that deleted the approval or worker response still referenced by saved state. Ten initial regressions failed before the correction. Review decisions now atomically record an optional exact decision reference, and readback requires the original workspace, record, decision, post-revision, and status. Only confirmed compare-and-set conflicts discard unused evidence; unknown outcomes retain it and return a sanitized HTTP 503. Existing exact-payload approval authority is unchanged.
- Independent review exposed additional consumer and retry risks. Five further regressions failed before corrections. Intervention-bound responses now require a confirmed claim before normal lists, accountability, or outcome evaluation can use them. Worker webhooks reserve a nonretryable delivery before matching; an expired owner cannot reserve it, uncertain reservations cannot expire through TTL, and replay cannot rematch another intervention. Ordinary work-signal retries are unchanged. Legacy response records without the new optional state retain their existing behavior.
- Recovery uses a primary read, five-second driver operation timeout, server limit, and caller deadline. A late read cannot resume downstream work. Successful reviews add no database round trip; response confirmation and webhook reservation each add one necessary bounded-identity write. No new dependency, index, provider permission, external write, or background polling workload was introduced. This is an integrity tradeoff, not a measured speed improvement.
- A further review found stale delivery finalization could overwrite a newer quarantine, the HTTP serializer dropped recovery classifications, and the TTL-free quarantine did not satisfy schema validation. Five more regressions failed before correction. Finalization now checks the exact attempt and owned status plus the matched count. The HTTP response preserves only three allowlisted recovery classifications and sanitized messages; arbitrary database details remain excluded. Quarantined records now validate without an expiry; successful delivery states still require one.
- The synthetic real-Mongo verifier passed eight scenarios: three committed review decisions with lost acknowledgements, unavailable and superseded review readback, a recovered worker response, an unconfirmed webhook response whose replay leaves adjacent work untouched, and a stale signal finalizer racing a newer worker reservation. Reconnection preserved retained evidence; actual outcome evaluation and accountability excluded pending responses. Two explicitly seeded synthetic successful attempts supported evaluation, with zero additional attempts and zero provider writes. Cleanup removed the disposable database.
- Full-suite validation initially found one outdated response-model mock without the newly required confirmation write; the fixture was corrected and its focused test passed. This is not evidence of a production failure. Extended-outage/process-loss reconciliation, historical evidence certification, signed clean-machine installation, live provider/ngrok/HAI acceptance, and the full goal remain incomplete.
- Final `npm run check:ci` passed lint, 180 route authorization contracts, 144 suites/1,172 tests, and all five recommendation scenarios. The full dependency audit reported zero known vulnerabilities. Independent final code review found no remaining actionable issues; it inspected code/tests and the verifier but did not independently rerun the suites. A separate database inventory confirmed no remaining acknowledgement-verification databases. GitHub's paginated open-pull-request inventory was empty before publication.
- The unsigned Windows 2.3.53 installer built successfully. All six changed runtime files match the packaged archive byte for byte. The five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, main exit code zero, settled process inventory, no remaining processes, and port release. Four processes sampled 377.5 MB working set, 365.4 MB private memory, and 1.688 cumulative CPU seconds. This is a sample, not an isolated performance comparison or proof that the historical intermittent shutdown issue is resolved.

## Native backup/restore rehearsal (2026-09-06)

Historical verification record; dependency audit results are dated observations.

- Added `npm run verify:backup-restore` using the actual MongoDB `mongodump`/`mongorestore` programs, not a JSON-copy substitute. The developer-only drill uses synthetic data and newly named, ownership-marked loopback databases; no installed application, model, route, UI, provider authority, or runtime dependency changed. The application version remains 2.3.52.
- The first native attempt exposed an incomplete synthetic Board fixture (its required URL was absent); the fixture was corrected against the existing schema. The final Windows run passed on MongoDB 8.2.2 with Database Tools 100.18.0. The official Windows tools archive was checked against its published SHA-256 before local use. It was not installed globally or committed.
- The final round trip preserved 42 collections, 444 index definitions, and 15 representative records. Streamed native BSON hashes cover identifiers, dates, binary data, 64-bit integers, Decimal128, timestamps, embedded payloads, and field order. Index checks include compound-key order, uniqueness, filters, collection options, and empty-collection indexes; equal counts alone cannot satisfy the check. The 8,259-byte synthetic compressed archive took 9,757 ms for the dump/restore-and-comparison interval. This tiny quiescent sample is not a throughput benchmark or production-volume rehearsal.
- Restored Mongoose/service reads passed workspace migration preflight, exact approval/payload references, failed-action reconciliation state, credential decryption with the original synthetic key, rejection with a different key, HAI snapshot references, and cross-workspace exclusion. Source fingerprints and restored fingerprints remained unchanged by verification reads. The archive and both owned databases were removed; a separate filtered database inventory after the final successful run found no drill databases.
- Independent review identified topology-discovery, short-circuit cleanup, and uncertain-claim tracking gaps. Six regressions failed before their corrections: accepted loopback topology could admit an advertised remote replica member, native timeout lacked forced termination, cleanup lacked independent settled-initialization handling, and lost marker acknowledgements were not tracked. The final 26 focused checks pass. Both driver and native connections now force direct routing, pending initialization blocks unsafe database deletion, each safely cleanable resource is attempted independently, and ownership is re-read after an uncertain claim. Original and cleanup failures are retained internally while CLI output excludes native arguments and private error details.
- Final `npm run check:ci` passed lint, all 180 route authorization contracts, 143 suites/1,151 tests, and all five recommendation scenarios. Independent follow-up review found no remaining actionable issues and separately passed 24 focused checks; the parent run also passed both child-process cases, for all 26 focused checks. GitHub's paginated open-pull-request inventory was empty before publication.
- MongoDB CI now invokes the native drill using tools copied from its existing isolated MongoDB service. Actual runner compatibility must be checked after publication. The full dependency audit reported zero vulnerabilities. No public tunnel, provider call, live workspace backup, production database restore, or publisher-signing action was performed.
- The operator runbook explicitly keeps production gates open: encrypted/access-controlled backups, separate recovery of encryption keys and token peppers, topology-appropriate consistent backup, actual production-like volume, restore/rollback and recovery targets, and provider reconciliation before re-enabling writes. The synthetic drill does not prove these requirements or resolve the historical intermittent Windows shutdown issue. The full goal remains incomplete.

## 2.3.52 startup cancellation and acquisition ownership (2026-09-06)

Historical release evidence:

- Eleven controlled startup interruptions reproduced initialization resuming after shutdown, and a concurrent-start test reproduced duplicate connection work and lost listener ownership. The tests use the real application entry point and local HTTP listeners with controlled database/provider/worker boundaries; they do not contact external accounts.
- Initialization now shares one acquisition operation and checks cancellation after each asynchronous startup boundary. A quit request prevents further migration stages, new synchronization/maintenance phases, tunnel startup, webhook reconciliation, or a transition to serving. Cleanup waits for the current acquisition within the configured shutdown grace before the existing component drains. Concurrent initialization shares one listener; a stopped runtime rejects late initialization rather than restarting implicitly. Desktop relaunch remains a new process.
- A startup acquisition timeout is reported as `SNEUP_SHUTDOWN_INCOMPLETE`, not successful cleanup. Review and a failing regression confirmed that a connection could complete just after the drain's final database check. The startup failure handler now performs one fresh cleanup pass after joining a drain that timed out on acquisition. The failed runtime state is retained even if later cleanup succeeds. This avoids recursive startup/cleanup waits and does not retry provider work.
- All 19 focused startup cases pass, including eleven startup boundaries, concurrent initialization, stalled acquisition bounds, late completion both after and during drain completion, late Trello schedules during a previous drain, connection rejection without demo fallback, real listener binding/close, and refusal to restart after stop. Independent review found no remaining actionable issue and passed 49 checks across five suites before the final Trello-overlap probe was added as a permanent regression. The full dependency audit reports zero vulnerabilities; no dependencies, models, routes, credentials, HAI permissions, or provider approval rules changed. The resource improvement is avoiding duplicate initialization and orphaned resources, not a measured steady-state speedup.
- The unsigned Windows 2.3.52 installer built successfully and its packaged application entry point matches source byte for byte. A five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, settled process inventory, main-process exit code zero, no observed remaining processes, and port release. Four processes sampled 366.6 MB working set, 344.6 MB private memory, and 1.484 cumulative CPU seconds. This observation was not an isolated performance comparison.
- Final `npm run check:ci` passed lint, all 180 route authorization contracts, 142 suites/1,125 tests, and all five recommendation scenarios. Remote `main` matched the local base and GitHub's open-pull-request inventory was empty before publication. Remote CI must be checked after pushing the exact commit.
- `npm run check:release-security` refused this development environment because it requires `NODE_ENV=production`. No production environment or credentials were fabricated to turn that deployment gate green. Live provider interruption, hosted ngrok/HAI acceptance, signed clean-machine installation, and recovery drills remain separate gates. This correction does not establish the cause of the historical intermittent Windows normal-close failure. The full production-readiness goal remains incomplete.

## 2.3.51 fatal cleanup ownership and Windows process verification (2026-09-06)

Historical release evidence:

- Five fresh packaged 2.3.50 demo runs closed normally before changes. They did not reproduce or explain the historical intermittent normal-close failure. Independent runtime investigation instead found a distinct fatal-error race: Winston could exit before the application's awaited cleanup completed. Real Node child-process tests reproduced both uncaught-exception and unhandled-rejection exits before a controlled 3.5-second drain completed.
- The logger now uses conditional `exitOnError`: the registered runtime owns fatal shutdown, while standalone commands without that handler retain Winston's fatal-exit fallback. Fatal events arriving during an ordinary signal drain also latch exit status 1 instead of being discarded behind the existing single-cleanup guard. Four pre-fix regressions failed; all five final fatal-cleanup tests pass, including real child-process exit, exception/rejection log retention, standalone fallback, and signal-drain failure status. This follows [Winston's documented exit control](https://github.com/winstonjs/winston#to-exit-or-not-to-exit), without removing error logging or allowing the runtime to continue after a fatal error.
- Three Windows verifier regressions initially demonstrated false lingering-process reports, termination attempts against a reused/changed process identity, and missed late descendants. The checker now pins process handles, validates creation times after opening each candidate, tracks newly observed descendants, and limits failure cleanup to verified process objects. Retained handles keep their process identity stable until released, consistent with [Microsoft's process-handle explanation](https://devblogs.microsoft.com/oldnewthing/20110107-00/?p=11803). These are controlled fixture reproductions, not evidence that an unrelated real process was terminated.
- Review reproduced a fourth verifier race: a parent could spawn a final child between enumeration and exit. The final check now requires an inventory taken after all known processes were observed exited, with no newly discovered identities. Discovering even an already-exited descendant forces another pass. All ten Windows verifier tests pass; the clean-exit, nonzero/unknown exit, lingering child, rejected close, and occupied-port gates remain intact. The 12-second close deadline was not relaxed. Independent review found no remaining actionable issue in the correction and independently exercised the clean and final-inventory race scenarios.
- Final `npm run check:ci` passed lint, all 180 route authorization contracts, 141 suites/1,106 tests, and all five recommendation scenarios. The full dependency audit reports zero vulnerabilities. No dependencies, database models, API routes, HAI permissions, or provider approval rules changed. Runtime exit handling adds no request-path database work; the extra process inventory belongs to verification, not the installed app's steady-state workload.
- The unsigned Windows 2.3.51 installer built successfully; the packaged logger and process-handler modules match source byte for byte. The final five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, settled process inventory, main-process exit code zero, no observed remaining processes, and port release. Four processes sampled 379.4 MB working set, 351.5 MB private memory, and 1.672 cumulative CPU seconds. This is an observation, not an isolated performance comparison.
- GitHub's paginated open-pull-request inventory was empty before publication; remote CI must be checked after pushing. The original intermittent normal-close cause remains unproven. These checks do not establish forced-termination/power-loss recovery, live provider transaction interruption, production restore, signed clean-machine installation, or hosted ngrok/HAI acceptance. The full production-readiness goal remains incomplete.

## 2.3.50 request routing and dashboard telemetry (2026-09-06)

Historical release evidence:

- Real HTTP tests reproduced a mismatch between Express's case-insensitive routing and the global API gate: mixed-case versioned metadata returned 200 without credentials, while a valid credential on a protected mixed-case route was not resolved and its route permission guard returned 401. The shared limiter also skipped mixed-case API prefixes or created separate buckets for equivalent route families. This is not evidence that protected data was read without authorization or that a live compromise occurred.
- API authentication, rate buckets, and request IDs now recognize the existing Express route casing. Public OAuth/invitation/webhook classification recognizes case and one optional trailing slash while retaining method restrictions and downstream state/token/signature verification. Request paths, route parameters, raw bodies, signatures, workspace identifiers, and credential values are not rewritten. Legacy `/api` metadata remains public; similarly named non-API paths do not receive API request IDs.
- Dashboard response-time monitoring previously recognized only legacy paths, missing the actual versioned frontend calls. It now maps legacy and v1 static view routes, with their existing casing/trailing-slash equivalents, into the same bounded recent history. Unknown route families and dynamic detail paths are not included. Case-equivalent API requests also share one bounded rate bucket, preventing duplicate bucket allocations; no dependencies or database queries were added. This is not a measured end-to-end speed improvement.
- The initial regression suite reported 28 failures and eight passes. A rate-test table-argument mistake was corrected and both rate cases were independently confirmed failing before the runtime fix. All 40 final compatibility checks pass, including authenticated HTTP context, actual completed v1 telemetry, Trello signature rejection, bounded generic webhook errors, public-method negatives, and all eight dashboard view mappings. Independent review found no actionable issues and passed 44 focused local checks, including existing bounded-retention tests.
- `npm run verify:hai-http` passed 15 checks against a fresh disposable MongoDB database. Real API-token and session reads preserve workspace isolation on canonical and mixed-case/trailing-slash routes; mixed-case proposal intake preserves permission checks and deduplicates on a canonical retry. HAI cannot approve or execute the proposal. There were zero approval records and zero Trello attempts; initialization-aware cleanup removed the verification database. No live provider, scheduled workers, or public tunnel were used.
- Full `npm run check:ci` passed lint, all 180 route authorization contracts, 140 suites/1,097 tests, and all five recommendation scenarios. The full dependency audit reports zero vulnerabilities. The unsigned Windows 2.3.50 installer built successfully; all four changed runtime modules match the packaged archive byte for byte. A five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, main-process exit code zero, no remaining processes, and port release. Four processes sampled 372.2 MB working set, 367.3 MB private memory, and 1.641 cumulative CPU seconds; this is not an isolated performance comparison.
- GitHub's paginated open-pull-request inventory was empty before publication. Remote CI must be checked after pushing. Live ngrok/HAI/provider acceptance, signed clean-machine installation, recovery drills, and the previously observed intermittent shutdown issue remain incomplete. The successful probe does not establish that intermittent issue's cause or resolution. The full production-readiness goal remains incomplete.

## 2.3.49 consistent early API failures (2026-09-06)

Historical release evidence:

- Seven HTTP regressions reproduced missing versioned error envelopes for authentication, missing configuration, malformed/oversized JSON, CORS rejection, and rate limiting. The existing `/api/v1` formatter now runs immediately after request context, before these middleware failures. Status codes, access decisions, parser limits, and error redaction remain unchanged.
- All 14 API contract tests pass, including unchanged legacy/webhook parser responses and adjacent `/api/v10` handling. Successful OpenAPI responses retain their existing raw-document opt-out; authentication failures do not use it. The authenticated disposable-MongoDB HAI verifier passed all 13 checks, now also requiring matching response/header request IDs and the v1 envelope for both successful and rejected requests. Cleanup removed the verification database; no provider writes, public tunnel, or scheduled workers were started.
- Full `npm run check:ci` passed lint, all 180 route authorization contracts, 139 suites/1,057 tests, and all five recommendation evaluation scenarios. The full dependency audit reports zero vulnerabilities. Independent read-only review found no concrete issues in middleware ordering, compatibility, or scoped resource/security behavior; the reviewer ran syntax checks, not HTTP/database verification.
- The unsigned Windows 2.3.49 installer built successfully, and its packaged application entry point matches source byte for byte. A five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, requested normal close, main-process exit code zero, no remaining processes, and port release. Four processes sampled 378.1 MB working set, 386.6 MB private memory, and 2.031 cumulative CPU seconds. This sample is not an isolated performance comparison.
- GitHub's paginated open-pull-request inventory was empty before publication. Remote CI must be checked after pushing. Live HAI/ngrok/provider acceptance, signed clean-machine installation, recovery drills, and the previously observed intermittent shutdown issue remain incomplete. This passing shutdown probe does not establish that the intermittent issue is resolved. The full production-readiness goal remains incomplete.

## 2.3.48 authenticated HAI and credential relationships (2026-09-06)

Historical release evidence:

- A real Express/HTTP/MongoDB reproduction found four invalid credential cases returning HTTP 200: missing API-token workspace, missing referenced API-token user, API-token user in another workspace, and session user in another workspace. The workspace fallback could select the default workspace; the missing-user fallback could adopt the API token's service role. A valid secret and invalid stored relationships were required; this was not a no-credential bypass or evidence of a live compromise.
- Both database credential resolvers now share relationship validation before activity updates and auth-context construction. Workspaces must resolve, user-bound credentials require an active user belonging to that workspace, and a dangling user reference cannot become an intentionally userless service token. Existing scoped service access, role precedence, workspace-header restrictions, archived/deleting management access, and provider approval gates remain unchanged. The fix uses already populated records and adds no database queries.
- Eight initial unit regressions failed before the fix. All 22 final relationship checks pass, including raw BSON reference rejection, disabled/unscoped users, valid membership, and userless service/session distinctions. Existing security fixtures now include real-world user workspace membership. The focused security run passed 426 tests; the full `npm run check:ci` passed lint, 180 route contracts, 139 suites/1,049 tests, and all five recommendation scenarios. The full dependency audit reports zero vulnerabilities.
- The new `npm run verify:hai-http` passed 13 HTTP checks with synthetic data and fresh random credentials in a dedicated disposable MongoDB database. Valid service/user reads, header isolation, missing credential rejection, read-only restrictions, pending proposal persistence/deduplication, denied approval/execution, and all four invalid relationship cases passed. It recorded zero approvals and zero Trello attempts. Server shutdown and initialization-aware database removal completed; an independent check after the first passing run found no remaining collections. No provider calls, scheduled workers, or public tunnel were started.
- Independent boundary investigation and a fresh bypass/regression review found no remaining concrete issue in the scoped fix. The reviewer also passed 22 database-free checks using real Mongoose documents/population with intercepted queries. Concurrent lifecycle changes and live production acceptance remain outside this proof.
- The unsigned Windows 2.3.48 installer built successfully; its authentication module matches the source byte for byte. A five-second packaged demo probe passed health, nine redacted diagnostics, HAI `never_direct`, normal requested close, main-process exit code zero, no remaining processes, and port release. Four processes sampled 371.7 MB working set, 349.7 MB private memory, and 1.812 cumulative CPU seconds. This is a sample, not an isolated performance comparison.
- Legacy workspace-less credentials must go through the existing migration before use. Missing or mismatched relationships require operator review, not inferred reassignment. The new HTTP verifier is wired into the MongoDB CI job; remote CI must be checked after publication. Live HAI/ngrok/provider acceptance, signed clean-machine installation, recovery drills, and the previously observed intermittent shutdown issue remain incomplete. The full production-readiness goal is not complete.

## 2.3.47 database-backed HAI verification (2026-09-06)

Historical release evidence:

- HAI snapshots now preserve native MongoDB ObjectIds and populated board/card references as validated hexadecimal identifiers. Arbitrary nested objects are not stringified. No new provider or approval authority is introduced.
- First-use board-health reads wait for model/index initialization before issuing the existing hinted aggregate. The wait has its own query-timeout bound and does not cancel the cached initialization; subsequent reads can recover. Aggregate limits and its separate timeout remain unchanged.
- Review identified an unbounded initialization wait and a verifier cleanup race. Four regression cases failed before correction. Cleanup now settles every registered model initialization, refuses to race a timed-out initialization with a database drop, confirms no collections remain, and disconnects on success or failure. The five cleanup tests include ownership refusal and failed-drop handling.
- Focused verification passed four suites/21 tests. Full `npm run check:ci` passed lint, all 180 route contracts, 138 suites/1,027 tests, and all five recommendation evaluation scenarios. The full dependency audit reports zero vulnerabilities. Independent read-only review found no remaining actionable issues.
- `npm run verify:hai-snapshot` passed against a fresh disposable local MongoDB database. It checked real identifiers, cross-workspace exclusion, a snapshot-to-proposal round trip, idempotent repeated proposal intake, zero approvals, and zero Trello attempts. The database was dropped after initialization settled; an independent read confirmed zero remaining collections. No live provider calls were needed. The same verifier is wired into a dedicated MongoDB 7.0 CI job; its remote result must be checked after publication.
- The unsigned Windows 2.3.47 installer built successfully. Both changed runtime services match the packaged archive byte for byte. The five-second packaged demo probe passed healthy metadata, nine redacted diagnostics, HAI `never_direct`, requested normal close, main-process exit code zero, no remaining processes, and port release. Four processes sampled 372.0 MB working set, 362.3 MB private memory, and 2.609 cumulative CPU seconds; this is an observation, not an isolated performance comparison.
- GitHub's paginated open-pull-request inventory was empty before publication. Live authenticated HAI/ngrok deployment, authorized provider execution, signing, clean-machine installation, and production recovery remain separate acceptance gates. The previously observed intermittent desktop shutdown deadline miss remains unexplained; this passing probe does not prove it resolved. The full production-readiness goal remains incomplete.

## 2.3.46 release exit-status verification (2026-09-05)

Historical release evidence:

- The packaged verifier previously accepted process disappearance even when the main process exited with status 1 or its exit code was unavailable. Both cases were reproduced as failing regression tests against the unchanged verifier before correction.
- Acceptance now requires a requested close, no remaining descendants, a confirmed main-process exit code of zero, and a released port. The original main-process handle is retained until validation/cleanup finishes and is disposed on every exit path. The existing 12-second shutdown deadline is unchanged.
- Six Windows-only tests execute the real verifier with controlled OS boundaries: clean exit, failed exit, unknown exit status, lingering descendant, rejected close request, and occupied port. All six pass. Windows CI explicitly runs these tests before packaging; non-Windows quality runs skip this Windows-specific suite.
- The full local `npm run check:ci` passed lint, all 180 route contracts, 137 suites/1,015 tests, and recommendation evaluation. Independent review found no actionable issues and reran all six focused tests successfully. These fixture tests exercise acceptance logic, not real operating-system failure injection; actual cleanup-exception and crash behavior remains outside this proof.
- The existing unsigned 2.3.46 package passed the stricter local probe with exit code 0, healthy metadata, nine redacted diagnostics, HAI `never_direct`, no remaining processes, and port release. Four processes sampled 373.0 MB working set, 373.3 MB private memory, and 2.234 cumulative CPU seconds. This is a single observation, not a performance comparison or production acceptance claim.
- Application source, dependencies, database models, API routes, and provider/approval policies are unchanged. The previously recorded intermittent shutdown deadline miss remains unexplained; improved exit verification is not evidence that its cause was fixed. Live provider, hosted ngrok/HAI, signing, clean-machine installation, and production recovery acceptance remain outstanding.

## 2.3.46 desktop readiness verification (2026-09-05)

Historical release evidence:

- Desktop readiness now schedules one retry per failed health request, including when a timeout is followed by a socket error. Normal quit cancels the active request and pending retry. Only HTTP 200 opens the command center; the existing 80-attempt limit, one-second inactivity timeout, and 250 ms retry interval remain unchanged.
- Four regressions failed against 2.3.45 before the fix: duplicate retries, an uncancelled active request, a queued retry after quit, and HTTP 401 accepted as ready. All 21 desktop lifecycle checks now pass, including retry exhaustion, HTTP 301/401/404/503 rejection, late errors, and the existing shutdown/restart cases. Two checks use actual local HTTP sockets: recovery from 503 to 200, and cancellation before response headers arrive.
- Independent review found no actionable issues. The full dependency audit reports zero vulnerabilities. The change adds no dependencies, database/schema changes, routes, or provider permissions; exact-payload approvals and HAI write restrictions are unchanged.
- The final full `npm run check:ci` passed lint, all 180 route contracts, 136 suites/1,009 tests, and recommendation evaluation, including both real-socket cases. An earlier focused backend test hit its existing five-second timeout and subsequently passed in both full runs without relaxing the timeout.
- The unsigned Windows 2.3.46 installer built successfully. Archive inspection confirmed the packaged desktop entry point matches the edited source. Three consecutive five-second packaged probes passed version/health checks, nine redacted diagnostics, HAI `never_direct`, normal close, zero remaining processes, and port release. These four-process samples ranged from 334.8 to 381.1 MB working set, 347.0 to 389.7 MB private memory, and 2.125 to 2.406 cumulative CPU seconds; they are observations, not an isolated performance comparison.
- The intermittent 12-second local shutdown deadline miss reproduced once on 2.3.46 before the successful reruns: health and safety checks passed and the port closed, but one process remained. The verifier now includes the main PID/exit state and remaining process roles, without exposing raw command lines or changing the success conditions or deadline. The cause remains unexplained; this readiness correction is not claimed to resolve it.
- Process termination, power loss, Windows session shutdown, live provider authorization, hosted ngrok/HAI, signing, clean-machine installation, and production recovery remain separate acceptance gates. The full production-readiness goal is not complete.

## 2.3.45 desktop lifecycle verification (2026-09-05)

Historical release evidence:

- Electron normal quit, settings restart, and recovery-to-demo restart now invoke the existing runtime shutdown before permitting successful exit or scheduling a relaunch. Concurrent quit requests share one cleanup operation. Cleanup failure exits with status 1 and does not relaunch; logs do not include the private error payload.
- Runtime initialization is tracked separately from health polling and renderer loading, so a pending page cannot block cleanup of an initialized backend. Initialization itself has a bounded wait using the existing configured shutdown grace. Normal activation and second-instance focus cannot show a closing window.
- Six initial lifecycle regressions failed before implementation. Independent review identified two additional races; both were reproduced with failing tests before correction. All ten desktop lifecycle cases now pass, including normal/repeated close, IPC restart, failure handling, pending initialization, timeout, live startup recovery, pending renderer load, and second-instance behavior.
- The final default-timeout `npm run check:ci` passed lint, all 180 route contracts, 136 suites/998 tests, and 5/5 recommendation scenarios. Earlier local cold-load attempts hit an existing five-second backend test timeout; an isolated longer-allowance run and the final full run with default timeouts passed. No production timeout was relaxed.
- The full dependency audit reports zero vulnerabilities. Backend domain models, provider permissions, approval rules, and database schemas are unchanged.
- This verification covers graceful application close/restart, not forced termination, power loss, or Windows session termination. Live provider, hosted ingress/HAI, and production recovery acceptance remain separate gates.

## 2.3.44 dependency security verification (2026-09-05)

Historical release evidence:

- An explicit `qs: 6.16.0` override fixes the installed dependency affected by [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) and [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g). Both Express and body-parser resolve the fixed version; Express remains 4.22.2 and body-parser remains 1.20.6. Their upstream `~6.15.1` ranges require the override until they admit a fixed version.
- The dependency defects were reproduced with eight failing regression cases before the fix. All 16 focused checks pass afterward, including encoded bracket arrays, both hostile-object parsing modes, real buffers, nested forms, OAuth encoding, repeated values, literal commas, and existing parameter/depth error responses.
- Exposure classification: installed dependency vulnerabilities confirmed; a complete remote Sneup exploit was not established. The application does not enable comma splitting and no application `qs.stringify` sink was found. The patch does not change request parser options or provider authorization.
- Compatible lockfile updates also remediate development/build findings in `browserslist`, `fast-uri`, and `@xmldom/xmldom`. Production and full `npm audit` checks both report zero vulnerabilities at verification time.
- `npm run check:ci -- --silent` passed lint, all 180 route contracts, 135 suites/988 tests, and 5/5 recommendation scenarios. This includes ngrok, HAI, OAuth, webhook, approval, and desktop regression coverage.
- Startup verification returned HTTP 200 for all seven Overview probes. Import retained 254 modules without Mongoose at 70.5 MB RSS; Overview retained 266 modules without Mongoose at 75 MB RSS. The concurrent-build sample took 1,446 ms to import and 163.8 ms for Overview; it is not an isolated performance comparison.
- The unsigned Windows installer built locally and in [GitHub run 33926849424](https://github.com/Robert-Velhorst/008-Sneup-Digital-Project-Manager/actions/runs/33926849424) for source `a2438fa968ad05881d5a96646b7b323828f4e871`. Both CI jobs passed; the installer artifact is `9957147799` (109,511,429-byte archive).
- Local archive inspection found exactly one bundled `qs` copy at 6.16.0. Its parser, serializer, and utility files match the installed patched dependency byte for byte.
- The original local probe did not prove normal close. A diagnostic rerun exposed the hidden-window discovery limitation of `.NET Process.MainWindowHandle`. The verifier now launches hidden and posts the normal Windows close message only to a known Sneup window title owned by the exact launched process. It reports whether a close was requested and which processes remain, without weakening the 12-second exit or port-release checks.
- The corrected five-second packaged probe passed healthy 2.3.44 metadata, nine redacted diagnostics, HAI `never_direct`, accepted close request, zero remaining processes, and port release. Four processes sampled 368.1 MB working set, 338.2 MB private memory, and 2.484 cumulative CPU seconds.

## 2.3.43 publication verification (2026-09-04)

Historical local evidence; the dependency warnings below were remediated in 2.3.44 above.

- Trello sync rebuilds list card references from active canonical cards, removes stale board memberships, and advances board freshness only after all detailed stages succeed.
- `npm run check:ci` passed lint, the 180-route authorization inventory, the full regression suite, and recommendation evaluation. Lint passed again after the verifier cleanup fix.
- The disposable MongoDB verifier passed with 300 lists, 15,000 target cards and 15,000 unrelated cards across 60 board identifiers. Exact list and board membership checks passed; one aggregation and one unordered bulk write reconciled lists using the intended compound index. This run measured 150.1 ms and 114.5 MB RSS, with no provider writes.
- Oversized verification database names are rejected before connection. Database cleanup now disconnects even when dropping the disposable database fails.
- The unsigned Windows 2.3.43 installer built successfully. Packaged demo health, nine redacted diagnostics, HAI `never_direct`, normal shutdown, and port release passed. All three changed runtime modules match the packaged archive byte for byte.
- The five-second packaged sample reported four processes, 376.6 MB working set, 356.1 MB private memory, and 3.219 cumulative CPU seconds. These are local observations, not clean-machine performance guarantees.
- `npm audit --omit=dev --audit-level=high` passed its threshold but reported three moderate dependency vulnerabilities involving `qs`, `body-parser`, and `express`. No fixed `qs` version was available within the existing `~6.15.1` dependency range. These warnings remain unresolved; this release does not claim a zero-vulnerability audit.
- GitHub's paginated open-pull-request inventory was empty before publication. GitHub CI for this publication must be checked separately after pushing.

## Baseline

- Branch: `main`
- Starting commit: `a22d9323b18bc0c948f670b8890462577236a1a8`
- Release under verification: `2.3.42`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 133 suites, 961 tests, including the 180-route authorization gate, exact viewed-revision authority, lazy ledger boundaries, low-level provider-write denial, ngrok safety, HAI, and ledger compatibility |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Distributed job lease | Pass: disposable MongoDB 7 simultaneous race produced one winner; exact-token renew/release, clean reacquisition, expiry takeover, and private-field exclusion passed |
| API contract | Pass: strict `/api/v1` success/error envelopes, correlated request IDs, legacy compatibility, raw HAI OpenAPI, streamed-response compatibility, and static-asset request-ID exclusion |
| Demo runtime smoke | Pass: 12-route HTTP matrix covered HTML, legacy/versioned metadata, security, mission control, jobs, operations ledger, connector catalog, HAI manifest/OpenAPI/snapshot, and a versioned 404 |
| Production database outage | Pass: packaged live mode kept port 3197 closed and displayed a stable, non-secret Windows recovery dialog with explicit demo or close choices |
| HAI HTTP smoke | Pass: versioned manifest/OpenAPI paths, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot with stable board/card identifiers |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed; unsafe listener URLs are rejected and closed; concurrent starts share one tunnel; runtime exact-origin CORS admission and restart cleanup are covered |
| Real MongoDB integrity repair | Pass: 40 collections migrated; two safe derived-state findings repaired with two audits; ambiguous Trello attempt remained review-only; provider writes false |
| Real MongoDB data retention | Pass: six eligible categories deleted, six protected records retained, six pre/post audit pairs stored, seven query indexes verified, provider writes false |
| Retention performance sample | Pass: six-category preview 35.09 ms, six audited category batches 936.39 ms, verifier RSS 94.1 MB; seven supporting indexes verified |
| Integrity API performance sample | Pass: 30 live requests measured 14.01 ms p50 and 23.71 ms p95; server working set 119.5 MB after browser QA |
| Authentication activity profile | Pass: 100 real-Mongo session resolutions retained 100 credential reads and reduced token/user activity writes from 200 to two; the five-minute boundary produced the next exact pair of active-only atomic touches |
| MongoDB pool profile | Pass: 100 concurrent reads completed in 115.5 ms; active driver options reported 20 maximum sockets, zero idle minimum, two simultaneous connection establishments, 60-second idle retirement, and five-second wait queue; peak checkout 17, listeners stable through reconnect, disposable database dropped |
| Review-concurrency profile | Pass: repeated disposable real MongoDB runs raced approve/reject and approve/payload-edit from one exact viewed revision; one winner per revision, exact active approval, zero orphan approvals, stale review/execution and terminal queue actions blocked, zero Trello attempts, zero provider writes, each database dropped |
| Follow-up integrity profile | Pass: simultaneous provider responses produced one owner and one WorkerResponse, exact intervention binding, only the matching follow-up resolved, adjacent same-card work remained due, simultaneous manual resolutions produced one winner, both audits used the authenticated workspace, zero Trello attempts, zero provider writes, database dropped |
| Trello webhook integrity profile | Pass: three boards and four observed webhooks produced exact create/update/delete recommendations, four decisions, four audits, zero attempts, zero provider writes, and zero new decisions on repeated reconciliation; low-level emergency stop denied mutation; database dropped |
| Portfolio-scale profile | Pass: real mission control read 60 boards/300 lists/15,000 cards/100 members plus 180 health snapshots; 791.1 ms cold, 607.9 ms p50, 683.4 ms p95, 352.5 MB peak verifier RSS, both compound indexes selected, 60 unique current boards, critical-first 20-row cap, 10/12/12 outputs bounded, approval required, provider writes false |
| Bounded-ranking resource sample | Pass: worst-case 15,000-card focus improved 42.8 to 16.2 ms, risks 50.5 to 19.9 ms, commands 90.3 to 43.2 ms, and command peak RSS about 165 to 106 MB while preserving stable rank/evidence behavior |
| Startup profile | Pass: import loaded 254 modules without Mongoose in 196.4 ms at 65.2 MB RSS; Overview remained Mongo-free, completed in 52.9 ms, and sampled 69 MB RSS |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: in-app Browser exercised all eight primary Dutch views, rendered ENH-039, and reported substantive content with equal document client/scroll width and zero overflowing controls at desktop; exact 390 px, live-account, and assistive-technology evidence remain external |
| HAI HTTP smoke | Pass: manifest/OpenAPI expose only bounded `snapshot` and approval-gated `propose`; provider writes `never_direct`, approval endpoint false, execution endpoint absent |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass locally: 2.3.40 product metadata, healthy demo state, nine redacted diagnostics, HAI `never_direct`, normal main-window close, loopback port release, three byte-identical changed runtime modules, and a semantically validated builder-transformed manifest |
| Packaged resource sample | Pass: four processes used 354.7 MB working set, 289 MB private memory, and 1.234 cumulative CPU seconds in the 30-second packaged probe. |
| Windows installer | Pass locally: 109,500,851 bytes, unsigned, SHA-256 `48EEDDEC38A94116354E9981F3CA6E460DB77ABF246AC83DEB6724B0063F5471`; executable metadata reports 2.3.40 |
| Fresh clone | Pass: exact 2.3.40 source `0271e443f7165494165b2acfba8d6d02decf3f24` passed GitHub Node 24 quality and Windows packaging/runtime |
| GitHub CI | Pass: run `31774312886`; quality 1 minute 13 seconds; Windows packaging/runtime 2 minutes 21 seconds |
| GitHub installer artifact | Pass: independently downloaded artifact `9209323265`; 109,507,120-byte archive digest `sha256:450b821e626dbb840635fed82775b07aec69d030b0f9c8b53fc090e7faa8c208`; exactly one 109,501,181-byte unsigned 2.3.40 installer, SHA-256 `EF7F9F558C9BF7B1E0F90E0F31D2FB3AA299FEAC3796A6A03B1F8491FE461DB5` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.

## 2.3.42 continuation evidence

| Check | Result |
| --- | --- |
| Demand loading | Pass: enhancement renderer absent on Overview, loaded once with the shared immutable fingerprint when opened, authenticated reads retained in the controller |
| Filter concurrency | Pass: a newer filter aborts prior reads, stale results cannot render, area options remain usable, and deterministic evaluation is reused for the page session |
| Initial transfer | Pass: app plus localization reduced by 3,790 raw, 1,100 gzip, and 802 Brotli bytes; 8,860 raw bytes deferred |
| Local quality | Pass: lint, 134 suites/966 tests, all 180 route contracts, 5/5 evaluation, two zero-vulnerability audits, and five-secret production validation |
| Resource profile | Pass: startup 248.4 ms at 69.9 MB RSS with Mongoose unloaded; 15,000-card p50 478.9 ms, p95 516.2 ms, peak RSS 350.7 MB; no provider writes |
| Browser | Pass: ENH-042 and P2/completed/resource filtering at desktop and 390x844, equal client/scroll width, zero overflowing controls, zero warnings/errors |
| Packaged Windows QA | Pass locally: version 2.3.42, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, 373.9 MB working set, 329.4 MB private memory, 1.547 CPU seconds, normal close, port released, four runtime/UI files byte-identical |
| Windows installer | Pass locally: 109,503,700 bytes, unsigned, SHA-256 `0F82F8C3950F7B7BFBB91F25AD175B16511ED880A7DC5EA4DF11CFE400FFA124` |
| Fresh-clone GitHub CI | Pass: source `8ad507c495041364684bad5c228f52e6a96140df`, run `31838341964`; quality 1 minute 9 seconds, Windows packaging/runtime 2 minutes 29 seconds |
| GitHub installer artifact | Pass: artifact `9233384858`, 109,509,955-byte archive digest matched GitHub; exactly one 109,504,027-byte unsigned 2.3.42 installer, SHA-256 `257181CA67720BAFB7FEEB2DE837CC3DEDF84317F9F7CBBC951F2539FF6C11CE` |
| External gates | Live provider/ngrok/HAI acceptance, deployment/restore, publisher signing, clean VM, and assistive technology remain owner-controlled |

## 2.3.41 continuation evidence

| Check | Result |
| --- | --- |
| Route authorization | Pass: 180 routes inventoried, 174 known literal permission guards, six exact public contracts, and adversarial multiline/chained/computed/alias/dynamic/HEAD regressions |
| Exact-view authority | Pass: review, payload edit, and approved execution require the rendered revision; stale or missing evidence fails before approval/policy/provider authority and refreshes the ledger |
| Local quality | Pass: lint, 133 suites/961 tests, 5/5 evaluation, two zero-vulnerability audits, and five-secret production validation |
| Browser | Pass: approval and enhancement views, ENH-041, explicit demo read-only state, no mutation controls, no console warnings/errors, and no desktop/responsive horizontal overflow |
| Packaged Windows QA | Pass locally: version 2.3.41, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, seven runtime files byte-identical and manifest semantics preserved |
| Windows installer | Pass locally: 109,502,020 bytes, version 2.3.41, unsigned, SHA-256 `8C98235A0AFF195FCE544A30838E14B4AE3A02BA5441B73E771B27308849060D` |
| Fresh-clone GitHub CI | Pass: source `6e6e090665908230de2cac4873a31fa7d629d253`, run `31776949353`, both jobs successful |
| GitHub installer artifact | Pass: artifact `9210268095`, 109,508,298-byte archive digest matched GitHub; exactly one 109,502,377-byte unsigned 2.3.41 installer, SHA-256 `6AEE8B751B3765F1F9E9C32A6F3ED60F7D2C7AC6B1E432B0A1385F98F1F87A9E` |
| External gates | Live provider/ngrok/HAI acceptance, deployment/restore, publisher signing, clean VM, and assistive technology remain owner-controlled |

## 2.3.40 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Live workspace/ledger and mutation-specific dependencies load only when a request or operation needs them |
| Cold ledger route | Pass: seven-process average improved from 844.5 to 195.4 ms, 50.5 to 13.4 MB RSS growth, and 1,090 to 224 modules |
| Full quality gate | Pass: lint, 132 suites/949 tests, and 5/5 recommendation scenarios at 100% |
| Dependency and release security | Pass: production and full audits report 0 vulnerabilities; five independent production-style secrets accepted without exposure |
| Real-Mongo authority | Pass: review and follow-up races retained one winner; webhook reconciliation created only decisions/audits; zero Trello attempts or provider writes |
| Startup and portfolio scale | Pass: 196.4 ms/65.2 MB Mongo-free import; 52.9 ms/69 MB Overview; 15,000-card p95 561.5 ms and peak RSS 368 MB |
| Browser QA | Pass: all eight primary Dutch views loaded substantive content, ENH-039 rendered, and no document/control overflow was observed |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass locally: version 2.3.40, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, three runtime modules byte-identical and manifest semantics preserved |
| Packaged resource sample | Pass: 354.7 MB working set, 289 MB private bytes, and 1.234 cumulative CPU seconds |
| Windows installer | Pass locally: 109,500,851 bytes, version 2.3.40, unsigned, SHA-256 `48EEDDEC38A94116354E9981F3CA6E460DB77ABF246AC83DEB6724B0063F5471` |
| Fresh-clone GitHub CI | Pass: source `0271e443f7165494165b2acfba8d6d02decf3f24`, run `31774312886`, both jobs successful |
| GitHub installer artifact | Pass: artifact `9209323265`, archive digest matched GitHub, exactly one correctly versioned unsigned installer independently downloaded and hashed |
| External gates | Live provider/ngrok/HAI acceptance, deployment/restore, signing, clean VM, and assistive technology remain external |

## 2.3.39 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Exact-confirmation, revision-aware connector disconnect; local authority purge; authoritative disabled state; in-place reconnect |
| Full quality gate | Pass: lint, 131 suites/947 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: production audit reports 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo connector lifecycle | Pass: inexact confirmation rejected, credentials and refresh lease absent after disconnect, sync blocked before feature/provider work, same account reconnected, zero provider reads/writes |
| Recovery compatibility | Pass: 2 initial failures, 0 immediate retries, 1 due recovery, permanent account attempted once, compound index present, zero provider writes |
| Startup and portfolio scale | Pass: 304.8 ms/64.6 MB Mongo-free import; 68.2 ms/68.6 MB Overview; 15,000-card p95 780.8 ms and peak RSS 352.2 MB |
| Browser QA | Pass: connector marketplace and scope-review interaction, Dutch rendering, contained responsive layout, and zero console warnings; exact connected-account lifecycle states passed jsdom |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass locally: version 2.3.39, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, six runtime modules byte-identical and manifest semantics preserved |
| Packaged resource sample | Pass: 360.8 MB working set, 294.9 MB private bytes, and 1.812 cumulative CPU seconds after five seconds |
| Windows installer | Pass locally: 109,500,269 bytes, version 2.3.39, unsigned, SHA-256 `51E89FB4AB173D053C54441C968EE3ACC04F18A08A878E8B5AA50FEA522B0812` |
| Fresh-clone GitHub CI | Pass: source `00494de5e5db01f650e3090a586ad7230f3f5ea8`, run `31772690720`, both jobs successful |
| GitHub installer artifact | Pass: artifact `9208737219`, archive digest matched GitHub, exactly one correctly versioned unsigned installer independently downloaded and hashed |
| External gates | Hosted OAuth/credential lifecycle, provider-side revocation, owner-authorized provider/ngrok/HAI acceptance, deployment/restore, signing, clean VM, and assistive technology remain external |

## 2.3.38 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Durable due-only retry for transient connector failures; permanent credential failures stop; manual and scheduled synchronization share one workspace lease |
| Full quality gate | Pass: lint, 130 suites/939 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo connector recovery | Pass: 2 initial failures, 0 immediate retries, 1 due recovery, permanent account attempted once, compound index present, zero provider writes |
| Startup and portfolio scale | Pass: 222.5 ms/60.2 MB Mongo-free import; 58.4 ms/64.6 MB Overview; 15,000-card p95 538.6 ms and peak RSS 348.8 MB |
| Browser QA | Pass: connector readiness interaction, Dutch connector rendering, and ENH-037 at desktop and 749 CSS-pixel minimum; contained document/buttons and zero console warnings; exact 390 CSS-pixel viewport unavailable in this Browser runtime |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.38, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, seven runtime/config modules byte-identical |
| Packaged resource sample | Pass: 371.2 MB working set, 335.9 MB private bytes, and 2.031 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,498,183 bytes, version 2.3.38, unsigned, SHA-256 `1A23AEC8A1FF83EE2FE0157D0CD7526F2FED018C96134430B816D3044EC099DC` |
| Fresh-clone GitHub CI | Pass: source `8d510d20a7617dab5c82e88a758518b24f1661af`, run `31770300777`, both jobs green |
| GitHub installer artifact | Pass: artifact `9207912643`; exactly one unsigned version 2.3.38 EXE; 109,498,445 bytes; SHA-256 `CB13929F88B6E99E3C436F139D1A65FD528BF19B181273DA35751B67226C5699` |
| External gates | Owner-authorized live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.37 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Observe webhook state after the final ngrok callback; queue exact protected create/update/delete decisions; perform no startup mutation |
| Full quality gate | Pass: lint, 129 suites/932 tests, and 5/5 recommendation scenarios at 100% |
| Real-Mongo webhook reconciliation | Pass: 3 boards, 4 observed webhooks, 4 exact decisions, 4 audits, zero duplicate decisions on repeat, zero attempts, zero provider writes |
| Emergency stop | Pass: all low-level Trello card and webhook mutators deny writes before client initialization |
| Startup and portfolio scale | Pass: 294.4 ms/63.9 MB Mongo-free import; 54.4 ms/68 MB Overview; 15,000-card p95 587.3 ms and peak RSS 350.8 MB |
| Browser QA | Pass: ENH-036 and approval ledger at desktop and minimum responsive viewport; contained document/buttons and zero console errors; exact 390 CSS-pixel viewport unavailable in this Browser runtime |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.37, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, 12 runtime/UI modules byte-identical |
| Packaged resource sample | Pass: 371.2 MB working set, 334.1 MB private bytes, and 1.578 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,496,625 bytes, version 2.3.37, unsigned, SHA-256 `C3C9BBE31F1330E1FF4FE304831D343892D418C1B3FB2AD3AF89F671F22953B5` |
| Fresh-clone GitHub CI | Pass: source `68f23c58f96d2e1ae086809e4240a15a25309930`, run `31768820241`, both jobs green |
| GitHub installer artifact | Pass: artifact `9207376171`; exactly one unsigned version 2.3.37 EXE; 109,496,991 bytes; SHA-256 `80C699B0D90063E6063D9E6605852BF34650F77F639EE56DAF001CF731149483` |
| External gates | Owner-authorized live Trello/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.36 continuation evidence

| Check | Result |
| --- | --- |
| Scope | One worker response owns one eligible executed intervention; exact recommendation/intervention identity precedes bounded card fallback; stale terminal transitions are rejected |
| Full quality gate | Pass: lint, 126 suites/915 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo follow-up races | Pass: one provider-response owner, one retained response, exact binding, only matching follow-up resolved, adjacent same-card work due, one manual winner, authenticated-workspace audits, zero Trello attempts, zero provider writes |
| Startup | Pass: 592.3 ms import, 67.3 MB RSS, 254 modules; Overview 131.4 ms, 71.5 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 739.7 ms p50, 741.7 ms p95, 352.2 MB peak RSS; bounded output and both exact indexes retained |
| Browser QA | Pass: ENH-035 and approval ledger at desktop and 390 x 844; equal client/scroll width, terminal controls absent, and zero console errors |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.36, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 375.4 MB working set, 369.9 MB private bytes, 1.453 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,494,173 bytes, version 2.3.36, unsigned, SHA-256 `E496C4BA3E0FD53BAF0B95801C2DC3500A0182956431118151D14355C62F88EB` |
| Fresh-clone GitHub CI | Pass: source `ad7311b5cc036c83432c0994aff2590970b783ca`, run `31767164629`, both jobs green |
| GitHub installer artifact | Pass: artifact `9206772471`; exactly one unsigned version 2.3.36 EXE; 109,494,377 bytes; SHA-256 `8D6E57890FCB080687F670B9E7BA157CDF97B81E688F8533FFA5EF541D43ECD1` |
| External gates | Live provider/ngrok/HAI acceptance, hosted multi-channel observation, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.35 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Review decisions compare one exact recommendation revision, bind one active approval, and reject stale queue mutations that could revive terminal work |
| Full quality gate | Pass: lint, 125 suites/910 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo review races | Pass: one winner for approve/reject and approve/payload-edit, zero orphan approvals, stale and terminal queue calls blocked, zero Trello attempts, zero provider writes |
| Startup | Pass: 447.1 ms import, 68.5 MB RSS, 254 modules; Overview 113 ms, 71.9 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 888.1 ms p50, 1,022.1 ms p95, 305.6 MB peak RSS; bounded output and both exact indexes retained |
| Browser QA | Pass: ENH-034 and approval ledger at desktop and 390 x 844; equal client/scroll width and zero console errors |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.35, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 371.7 MB working set, 335.2 MB private bytes, 1.844 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,493,402 bytes, version 2.3.35, unsigned, SHA-256 `91FB8AD4C65BEBDC3357F45D8C5711F8B24F546F3EA2AA08891A0B6A39F93E83` |
| Fresh-clone GitHub CI | Pass: source `2602cef6d7d17e44841e6b7ca9cad1c1f4ea4bed`, run `31765213372`, both jobs green |
| GitHub installer artifact | Pass: artifact `9206071000`; exactly one unsigned version 2.3.35 EXE; 109,493,593 bytes; SHA-256 `2D8686E28567F19087278A93016119FDC8DCC419F1391215CD17F9E1E7209D95` |
| External gates | Live provider/ngrok/HAI acceptance, hosted multi-operator observation, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.34 continuation evidence

| Check | Result |
| --- | --- |
| Scope | One newest health snapshot per board is selected before risk-first caps shared by brief, approval ledger, reports, notifications, and HAI |
| Full quality gate | Pass: lint, 124 suites/904 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup | Pass: 264.4 ms import, 70.6 MB RSS, 254 modules; Overview 57.7 ms, 74.8 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 615.2 ms p50, 653.7 ms p95, 357.2 MB peak RSS; latest-health query 17.3 ms, 60 unique boards, critical first, exact index |
| Browser QA | Pass: critical Board Health card and ENH-033 at desktop and 390 x 844; equal client/scroll width |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.34, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 371.5 MB working set, 392.4 MB private bytes, 1.484 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,492,015 bytes, version 2.3.34, unsigned, SHA-256 `626687D4366379FA97700A8E0ADDA265C328C3619A870F317C9634ACC8EEEA67` |
| Fresh-clone GitHub CI | Pass: run `31763249069` on source `05839483c1df250ea6acb0d265ce0e9b55510e03`; quality completed in 1 minute 19 seconds and Windows package/runtime in 3 minutes 6 seconds |
| GitHub installer artifact | Pass: artifact `9205413905`, archive size 109,498,043 bytes, digest `sha256:6ba5de40098a64796ffd7b386245827794ab0a156e81454fe0cca285abc72a2e`; its single installer is 109,492,086 bytes, unsigned, version 2.3.34, SHA-256 `9107BA108E3F5FD4699717C42C133E984CF16DA69E4B7BCAA62CD78124ECA326` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.33 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Active HTTP requests, scheduled callbacks, connector sync, retention, and deletion maintenance drain before MongoDB teardown within one validated grace window |
| Full quality gate | Pass: lint, 123 suites/902 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup | Pass: 315 ms import, 70.4 MB RSS, 254 modules; Overview 59.5 ms, 73.9 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards; 685.1 ms p50, 741.9 ms p95, 406.3 MB peak RSS, bounded output, exact index, approval required, provider writes false |
| Browser QA | Pass: nine setup diagnostics and ENH-032 at desktop and 390 x 844; equal client/scroll width |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.33, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, 15 runtime modules byte-identical |
| Packaged resource sample | Directional pass: 374 MB working set, 383.7 MB private bytes, 1.422 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,490,628 bytes, version 2.3.33, unsigned, SHA-256 `F397C644E8EC7BE71CCD72AA1B8F852A4EE7B3A73E7470824B1C34B1D094D32D` |
| Fresh-clone GitHub CI | Pass: run `31761836528` on source `ee83ea53bcf2a019a213cc5b71bd6b2631b5c264`; Node.js 24 quality completed in 58 seconds and Windows packaging/runtime in 2 minutes 34 seconds |
| GitHub installer artifact | Pass: artifact `9204933068`, archive size 109,496,649 bytes, digest `sha256:c6d846baee9551c44de26f87d907eaf7b170ffd2fc57d7d4b2cfea1763165d94`; its single installer is 109,490,671 bytes, unsigned, version 2.3.33, SHA-256 `259C80441889783AD6727B62E44E5112EB2382CD022D24769223FFB7716416A9` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.20 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Work Signals and normalized graph rendering extracted behind a retry-safe deferred module; guarded API and action authority remains in the controller |
| Full quality gate | Pass: lint, 110 suites/824 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-boundary, exact-evidence, unsafe-link, and action-delegation checks |
| Initial payload | Improved from 318,418 to 294,642 raw, 66,622 to 61,938 gzip, and 54,323 to 50,964 Brotli bytes; deferred renderer is 37,369 raw bytes |
| Browser QA | Pass: real in-app Browser, English/Dutch, one shared-fingerprint deferred script, filter interaction, exact provider evidence, no overlay, no horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.20, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.8 MB working set, 291.4 MB private bytes, 2.391 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,476,907 bytes, version 2.3.20, unsigned, SHA-256 `3B0E3460D84DAA3BD5CC7E182FA423287C321E4A50B83621E8F0E311450A6D95`; archive contains `public/workSignalsView.js` |
| Fresh-clone GitHub CI | Pass: run `31327523743` on source `0b19b13009bae3523d4cdffa14ea630c923b139f`; Node.js 24 quality completed in 1m01s and Windows packaging/upload in 2m14s |
| GitHub installer artifact | Pass: artifact `9041970725`, archive size 109,483,887 bytes, digest `sha256:7e47e852d4c7a084f5177c2d018aedb4ce5bd949ba9b6a623f6b0ed0d9040cb0`; its single installer is 109,477,917 bytes, unsigned, version 2.3.20, SHA-256 `D245ABBC0D6C6B3D4CDD2DA53DD81A310FA21D798631E05E6A36A0CC7EE8CBDC` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.21 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Forecasts, capacity/scenario/project-mapping forms, and Reports extracted behind retry-safe deferred modules; guarded API, persistence, download, and mutation authority remains in the controller |
| Full quality gate | Pass: lint, 111 suites/830 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-authority, exact-evidence, localization-completeness, form-persistence, retry, and action-delegation checks |
| Startup profile | Pass: import 945.9 ms at 53.2 MB RSS; seven-request Overview 187.4 ms at 58.6 MB RSS; 251/263 modules and no Mongoose loaded |
| Initial payload | Improved from 294,642 to 279,740 raw, 61,938 to 58,547 gzip, and 50,964 to 48,385 Brotli bytes; deferred renderers total 31,512 raw bytes |
| Browser QA | Pass: real in-app Browser, English/Dutch, one shared-fingerprint script per view, exact evidence, no overlay, no horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.21, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.5 MB working set, 290.1 MB private bytes, 1.688 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,479,199 bytes, version 2.3.21, unsigned, SHA-256 `B9E47D19CFA2C65A5263558953DF92351E6DD53F680E7965B71D9887AD2A1587`; archive contains `public/forecastView.js` and `public/reportView.js` |
| Fresh-clone GitHub CI | Pass: run `31329172266` on source `431e99dbfeef8e11105b079c620f101db338cf83`; Node.js 24 quality completed in 49 seconds and Windows packaging/upload in 2 minutes 15 seconds |
| GitHub installer artifact | Pass: artifact `9042435236`, archive size 109,485,393 bytes, digest `sha256:349a257ffc1cadbdaa37d45cc8e88695fcfa27ecb6fe86c3dc34cd99ef26d79a`; its single installer is 109,479,402 bytes, unsigned, version 2.3.21, SHA-256 `D41A927DDD85B0CC487F092DA3E856ECA4CCD9F6923EB0FE37094D283B023A1F` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.22 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Five workspace policy form renderers moved into the retry-safe deferred Workspace module; exact payload, API, persistence, refresh, and provider authority remains in the controller |
| Full quality gate | Pass: lint, 111 suites/831 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-authority, five-form rendering, localization, fixed-owner, persistence, retry, and action-delegation checks |
| Startup profile | Directional pass: import 297.6 ms at 64.4 MB RSS; Overview 94.6 ms at 68.3 MB RSS; 251/263 modules and no Mongoose loaded |
| Initial payload | Improved from 279,740 to 264,942 raw, 58,547 to 56,407 gzip, and 48,385 to 46,712 Brotli bytes; Workspace remains deferred and combined source after opening is 2,533 raw bytes smaller |
| Browser QA | Pass: real in-app Browser, English/Dutch, Workspace absent on Overview then loaded once with the shared fingerprint, read-only demo controls, no visible dialog or horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.22, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 361.1 MB working set, 292.3 MB private bytes, 1.688 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,479,448 bytes, version 2.3.22, unsigned, SHA-256 `7AEF17707C0B79EE7832C8AB321228172544E3C386529957B28B9E0498923E21`; archive contains updated `public/workspaceView.js` |
| Fresh-clone GitHub CI | Pass: run `31330566354` on source `f5b442e832cae763a33fe6212ed39a91c56024b9`; Node.js 24 quality completed in 1 minute 8 seconds and Windows packaging/upload in 2 minutes 13 seconds |
| GitHub installer artifact | Pass: artifact `9042817428`, archive size 109,485,528 bytes, digest `sha256:2e3f4a2213d97a47435a25cd9baaed11c1fac9bd51f132e59adabf40d6331114`; its single installer is 109,479,490 bytes, unsigned, version 2.3.22, SHA-256 `1791C0DF6CEA5ABD23572DEC33F997400AD13416A957A101DDFAA608709B1F16` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.23 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Ten connector account-selection form renderers moved into the retry-safe deferred Connector module; authenticated reads/writes, exact payloads, refresh, credentials, and provider authority remain in the controller |
| Full quality gate | Pass: lint, 111 suites/835 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, source-authority, all-ten-form rendering, localization, values, exact body, no-draft, empty-choice, duplicate-submit, cancellation, retry, and escaping checks |
| Startup profile | Directional pass: import 480.9 ms at 68.9 MB RSS; Overview 79.3 ms at 72.6 MB RSS; 251/263 modules and no Mongoose loaded |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,754.9 ms cold, 761.4 ms p50, 966.6 ms p95, 340.1 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 264,942 to 243,449 raw, 56,407 to 54,276 gzip, and 46,712 to 45,102 Brotli bytes; Connector remains deferred |
| Browser QA | Pass: real in-app Browser, English/Dutch, Connector absent on Overview then loaded once with the shared fingerprint, 117 connectors, four catalog-only providers, no horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.23, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.5 MB working set, 290.4 MB private bytes, 2.281 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,480,743 bytes, version 2.3.23, unsigned, SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`; archive contains updated `public/connectorView.js` |
| Fresh-clone GitHub CI | Pass: run `31332160310` on source `be0eeb677dbf1049ecfa15d29fe010f44d58f53e`; Node.js 24 quality completed in 1 minute 1 second and Windows packaging/upload in 2 minutes 26 seconds |
| GitHub installer artifact | Pass: artifact `9043260024`, archive size 109,486,755 bytes, digest `sha256:90fc98a6056c933649b977ea894e64369440cac1a53e85ceab735ecffb6a64a1`; its single installer is 109,480,729 bytes, unsigned, version 2.3.23, SHA-256 `EB60DF80CCDC45699A3254A56B48676E91AAE790C624213A8DD3BE449D1C7923` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.25 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Notification policy create/edit/status/test controls moved into the retry-safe deferred Approval module; exact bodies, API writes, refreshes, encrypted destinations, and provider authority remain in the controller |
| Correctness fixes | Pass: daily brief schedules survive partial updates; activation requires server-side confirmation; duplicate submissions are blocked; committed saves and delivered tests remain truthful if refresh fails |
| Full quality gate | Pass: lint, 111 suites/843 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup profile | Directional pass: import 325.1 ms at 67.8 MB RSS; Overview 90.1 ms at 72.2 MB RSS; 251/263 modules and no Mongoose loaded |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,225.4 ms cold, 567.1 ms p50, 604.4 ms p95, 330.6 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 233,925 to 220,951 raw, 52,495 to 50,424 gzip, and 44,254 to 42,523 Brotli bytes; Approval remains deferred |
| Browser QA | Pass: real in-app Browser, Approval absent on Overview then loaded once with the shared fingerprint, English/Dutch read-only demo rendering, no fabricated policy forms, no horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.25, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 363.3 MB working set, 329.4 MB private bytes, 1.578 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,482,700 bytes, version 2.3.25, unsigned, SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`; packaged `app.js`, `approvalView.js`, and `notificationService.js` are byte-identical to verified source |
| Fresh-clone GitHub CI | Pass: run `31335440803` on source `f2c6bc854739ead5d800a471468bc009a6d6604d`; Node.js 24 quality completed in 1 minute 12 seconds and Windows packaging/upload in 2 minutes 11 seconds |
| GitHub installer artifact | Pass: artifact `9044199111`, archive size 109,488,912 bytes, digest `sha256:94e1132dedb095bb16622868116e47334cd86e2bbcb1b0bb4f88c6951f595fc4`; its single installer is 109,482,942 bytes, unsigned, version 2.3.25, SHA-256 `AFCF25284ED347BEAF23A3E5F83D7AC3819FB2F337D457D7137880F5E49F158F` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.24 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Generic Webhook inbound worker-response mapping moved into the retry-safe deferred Connector module; authenticated reads/writes, exact payloads, refresh, credentials, and provider authority remain in the controller |
| Correctness fixes | Pass: encoded account routes; stale member/card searches cancelled and ignored; dependent state reset; inline recoverable errors; exact IDs and 100-item limit; duplicate pair/submit guards; successful-write/failed-refresh truthfulness across eleven connector forms |
| Full quality gate | Pass: lint, 111 suites/838 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup profile | Directional pass: import 8,969.7 ms at 69.8 MB RSS; Overview 563.6 ms at 72.7 MB RSS; 251/263 modules and no Mongoose loaded. Timings were affected by concurrent machine load and are not treated as a controlled regression |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,107.6 ms cold, 476.8 ms p50, 526 ms p95, 328.3 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 243,449 to 233,925 raw, 54,557 to 52,637 gzip, and 45,810 to 44,254 Brotli bytes; Connector remains deferred |
| Browser QA | Pass: real in-app Browser, Connector absent on Overview then loaded once with the shared fingerprint, 117 connectors, Dutch rendering, no fabricated account state, no visible dialog or horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.24, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 362.5 MB working set, 347.7 MB private bytes, 1.938 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,481,903 bytes, version 2.3.24, unsigned, SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`; packaged `app.js` and `connectorView.js` are byte-identical to verified source |
| Fresh-clone GitHub CI | Pass: run `31333762069` on source `7e9400cc48ae42cc7c92a0a3ec9389781833f6e0`; Node.js 24 quality completed in 1 minute 3 seconds and Windows packaging/upload in 2 minutes 46 seconds |
| GitHub installer artifact | Pass: artifact `9043718997`, archive size 109,488,047 bytes, digest `sha256:12528c7a7d929d6f2d6726cd74e98534af33001231ebd5c0785c3928e3100fed`; its single installer is 109,482,011 bytes, unsigned, version 2.3.24, SHA-256 `04BD2A3D63C29C24E5995FAB79060F68BDC6B3992740ABD634FC3C8BBCC82D14` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |
