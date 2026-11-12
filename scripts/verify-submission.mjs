import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const output = 'docs/evidence/runs/latest';
const baseline = '38f7f37cbb3fd11316b86ee5bcc14be3b297f4c9';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const cleanLog = (value) => value.replace(/[\t ]+$/gmu, '');
function git(args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error(`Git command failed: ${args[0]}`);
  return result.stdout;
}
function verifySourceHistory() {
  const localBaseline = spawnSync('git', ['cat-file', '-e', `${baseline}^{commit}`], {
    encoding: 'utf8',
    timeout: 15000,
  });
  if (!localBaseline.error && localBaseline.status === 0) {
    const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', baseline, 'HEAD'], {
      encoding: 'utf8',
      timeout: 15000,
    });
    if (!ancestor.error && ancestor.status === 0)
      return 'baseline is an ancestor of the current checkout';
  }

  const sourceCommit = readFileSync('SOURCE-COMMIT.txt', 'utf8').trim();
  const bundleHeads = git(['bundle', 'list-heads', 'source-history.bundle']).split(/\r?\n/u);
  if (!bundleHeads.some((entry) => entry.startsWith(`${sourceCommit} `))) {
    throw new Error(
      'The source history bundle does not contain SOURCE-COMMIT.txt as a branch head.',
    );
  }
  const bundleStatus = git(['bundle', 'verify', 'source-history.bundle']);
  if (!/complete history/iu.test(bundleStatus)) {
    throw new Error('The source history bundle is not self-contained.');
  }
  return 'complete source-history.bundle matches SOURCE-COMMIT.txt; current Git checkout is independent';
}
function inputs() {
  const paths = [
    ...new Set(
      git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
        .split('\0')
        .filter(Boolean),
    ),
  ]
    .filter((name) => !name.startsWith('docs/evidence/runs/') && existsSync(name))
    .sort();
  return paths.map((name) => ({ path: name, sha256: sha256(readFileSync(name)) }));
}
function fingerprint(files) {
  return sha256(JSON.stringify(files));
}
if (process.argv.includes('--check-evidence')) {
  const manifest = JSON.parse(readFileSync(`${output}/manifest.json`, 'utf8'));
  const current = inputs();
  const expected = new Map(manifest.inputs.map((file) => [file.path, file.sha256]));
  const actual = new Map(current.map((file) => [file.path, file.sha256]));
  const changed = [...new Set([...expected.keys(), ...actual.keys()])].filter(
    (name) => expected.get(name) !== actual.get(name),
  );
  if (changed.length || manifest.inputFingerprint !== fingerprint(current)) {
    console.error('Verification inputs do not match this checkout:', changed.join(', '));
    process.exitCode = 1;
  } else {
    const reportStatus = manifest.status;
    const invalidLogs = manifest.gates.filter(
      (gate) => !existsSync(gate.log) || sha256(readFileSync(gate.log)) !== gate.logSha256,
    );
    if (reportStatus !== 'passed' || invalidLogs.length) {
      console.error('Evidence is failed/incomplete or a command log has changed.');
      process.exitCode = 1;
    } else {
      console.log(
        `Evidence matches ${current.length} input files and ${manifest.gates.length} passing gate logs.`,
      );
    }
  }
} else {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !existsSync(npmCli))
    throw new Error('Run this tool with npm run verify:submission.');
  const historyValidation = verifySourceHistory();
  mkdirSync(output, { recursive: true });
  const captured = inputs();
  const manifest = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    timezone: 'UTC',
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    baseCommit: git(['rev-parse', 'HEAD']).trim(),
    baselineCommit: baseline,
    historyValidation,
    pendingChanges: Boolean(git(['status', '--porcelain']).trim()),
    inputFingerprint: fingerprint(captured),
    inputs: captured,
    status: 'running',
    gates: [],
    limitations: [
      'Input hashes exclude generated docs/evidence/runs to avoid circular hashing.',
      'No environment values, credentials or customer data are collected.',
      'Local verification does not prove hosted capacity, gateway configuration, independent security review, or human approval.',
    ],
  };
  const save = () =>
    writeFileSync(`${output}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  save();
  const gates = [
    ['typecheck', ['run', 'typecheck'], 120000, 0],
    ['lint', ['run', 'lint'], 120000, 0],
    ['format', ['run', 'format:check'], 60000, 0],
    ['coverage', ['run', 'test:coverage'], 120000, 0],
    [
      'dependency-audit',
      ['audit', '--json', '--audit-level=high', '--fetch-retries=0', '--fetch-timeout=20000'],
      60000,
      0,
    ],
    ['performance', ['run', 'benchmark'], 60000, 0],
    [
      'performance-failure-control',
      ['run', 'benchmark', '--', '--max-p95-ms=0.00000001'],
      60000,
      1,
    ],
    ['build', ['run', 'build'], 600000, 0],
  ];
  for (const [id, args, timeout, expectedExitCode] of gates) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath, [npmCli, ...args], {
      encoding: 'utf8',
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
    });
    const log = `${output}/${id}.txt`;
    const content = [
      `$ npm ${args.join(' ')}`,
      `Started: ${startedAt}`,
      cleanLog(result.stdout ?? ''),
      cleanLog(result.stderr ?? ''),
      result.error ? `Execution error: ${result.error.code ?? result.error.name}` : '',
      `Exit: ${result.status ?? 'none'}; signal: ${result.signal ?? 'none'}`,
    ]
      .filter(Boolean)
      .join('\n');
    writeFileSync(log, `${content}\n`);
    const passed =
      !result.error &&
      result.status === expectedExitCode &&
      (expectedExitCode === 0 ||
        (result.stderr.includes('Local performance gate failed:') &&
          result.stdout.includes('"passed": false')));
    manifest.gates.push({
      id,
      command: ['npm', ...args],
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: result.status,
      signal: result.signal,
      expectedExitCode,
      passed,
      log,
      logSha256: sha256(readFileSync(log)),
    });
    save();
    console.log(`${id}: ${passed ? 'passed' : 'FAILED'} (${log})`);
    if (!passed) break;
  }
  manifest.finishedAt = new Date().toISOString();
  manifest.status =
    manifest.gates.length === gates.length &&
    manifest.gates.every((gate) => gate.passed) &&
    fingerprint(inputs()) === manifest.inputFingerprint
      ? 'passed'
      : 'failed';
  save();
  console.log(`Submission verification: ${manifest.status}. Report: ${output}/manifest.json`);
  if (manifest.status !== 'passed') process.exitCode = 1;
}
