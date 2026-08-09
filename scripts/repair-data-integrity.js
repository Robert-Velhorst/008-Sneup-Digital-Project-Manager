require('dotenv').config();

const { connectDatabase, disconnectDatabase } = require('../src/utils/database');
const dataIntegrityService = require('../src/services/dataIntegrityService');
const { normalizeWorkspaceObjectId } = require('../src/services/workspaceScopeService');

const usage = () => [
  'Usage: npm run repair:data [-- --workspace <key>] [-- --limit <1-500>] [-- --apply --confirm repair-derived-state] [-- --json]',
  '',
  'The default is a read-only scan. Apply mode repairs only current list counts and member assignment/workload caches.',
  'Provider writes, notification retries, approval changes, and ambiguous execution reconciliation are never performed.'
].join('\n');

const parseArgs = args => {
  const options = { apply: false, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (['--workspace', '--limit', '--confirm'].includes(arg)) {
      if (!args[index + 1]) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = args[index + 1];
      index += 1;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.confirm && !options.apply) throw new Error('--confirm is only valid together with --apply');
  return options;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (process.env.SNEUP_DEMO_MODE === 'true') {
    throw new Error('Data repair cannot run in demo mode. Connect MongoDB first.');
  }

  await connectDatabase();
  try {
    const workspaceId = normalizeWorkspaceObjectId(options.workspace);
    const report = await dataIntegrityService.scan({ workspaceId, limit: options.limit });
    let output = { operation: 'dry-run', report: dataIntegrityService.publicReport(report) };
    if (options.apply) {
      output = {
        operation: 'apply',
        scan: dataIntegrityService.publicReport(report),
        result: await dataIntegrityService.apply({
          workspaceId,
          limit: options.limit,
          fingerprints: report.findings.filter(item => item.repairable).map(item => item.fingerprint),
          confirm: options.confirm,
          actor: process.env.SNEUP_SERVICE_ACTOR || 'sneup-repair-cli',
          source: 'manual'
        })
      };
    }
    process.stdout.write(`${JSON.stringify(output, null, options.json ? 2 : 2)}\n`);
  } finally {
    await disconnectDatabase();
  }
};

if (require.main === module) {
  main().catch(error => {
    process.stderr.write(`Data integrity command failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs, usage };
