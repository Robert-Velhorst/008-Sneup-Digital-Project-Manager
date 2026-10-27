# Local scheduler compatibility port

`node-schedule/` retains every file from public node-schedule2.1.2, commit6d5ad4b31dc5fc530a810489f482dd59cabc9803, including its MIT licence and all original tests/helpers. Only its package manifest and two runtime files change. The code uses cron-parser5.10.2 public CronExpressionParser, CronDate and CronExpression exports instead of removed deep imports/parseExpression/private fields. The original cancellation, callback, Promise/error, generator, date/rule, timezone and shutdown paths remain present.

The package is private, explicitly labelled as a local compatibility port, and retains the upstream version solely as provenance. It is not an official/publicly released node-schedule version. The deterministic full-source tarball installs ordinary dependency files rather than a link to a source directory; every tar payload matches the retained source. No dependency override, replacement test, source exclusion or claim of qualification is introduced.

All original tests/assertions/helpers/fixtures and licence files remain unchanged. An additive ESLint flat configuration migrates the original explicit rules/test quote policy to current stable tooling; its recommended rules and every failing diagnostic remain enforced. Build/test tools and runtime declarations use verified current stable registry targets. Original suites run only on disposable hosted workers. No port is accepted solely because it builds or passes application tests; upstream suites, source integrity, full dependency/native/browser/runtime and operator acceptance remain separately required.

See `node-schedule-port-provenance.json` for immutable upstream identities, source/test hashes, stable target metadata and the full-source package digest.
