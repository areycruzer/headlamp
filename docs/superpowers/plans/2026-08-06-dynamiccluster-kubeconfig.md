# Dynamic Cluster Kubeconfig Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dynamic-cluster E2E kubeconfig helper accept embedded certificate data and certificate paths relative to the kubeconfig file.

**Architecture:** Keep the change inside the existing Playwright spec. Pass an optional fixture path to `kubectl`, use `config view --raw --flatten` to produce a self-contained kubeconfig, and retain the existing cluster-renaming and base64 encoding behavior. Regression tests use real temporary kubeconfig files and the installed `kubectl`; they do not mock file or process behavior.

**Tech Stack:** TypeScript, Playwright Test, Node.js 20+ APIs, `kubectl`, YAML

## Global Constraints

- Modify only `e2e-tests/tests/dynamicCluster.spec.ts` in the implementation branch.
- Do not change Headlamp product code, CI workflows, dependencies, or documentation.
- Do not change the helper's default behavior for callers that use the active kubeconfig.
- Preserve command failures instead of returning an incomplete kubeconfig.
- Use Node.js >=20.11.1 and npm >=10.0.0.

---

### Task 1: Normalize file-based and embedded credentials

**Files:**
- Modify and test: `e2e-tests/tests/dynamicCluster.spec.ts:17-22,206-257`

**Interfaces:**
- Consumes: `kubectl` on `PATH`; an active kubeconfig for existing tests; an optional isolated kubeconfig path for regression tests.
- Produces: `getBase64EncodedKubeconfig(clusterName?: string, kubeconfigPath?: string): Promise<string>`.

- [ ] **Step 1: Add imports and literal kubeconfig fixtures**

Replace the CommonJS process and filesystem helpers with the same typed Node.js APIs already used by `podsPage.spec.ts`:

```ts
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import { HeadlampPage } from './headlampPage';
const yaml = require('yaml');

const execFileAsync = promisify(execFile);
```

Place this literal fixture builder immediately before `getBase64EncodedKubeconfig`. Its expected values are fixed inputs, not values derived by the code under test:

```ts
const makeKubeconfig = (cluster: Record<string, string>, user: Record<string, string>) => ({
  apiVersion: 'v1',
  kind: 'Config',
  clusters: [{ name: 'source', cluster: { server: 'https://127.0.0.1:6443', ...cluster } }],
  contexts: [{ name: 'source', context: { cluster: 'source', user: 'source' } }],
  users: [{ name: 'source', user }],
  'current-context': 'source',
});
```

- [ ] **Step 2: Write both failing regression tests**

Add the following cases before the helper. The production regression each test catches is removal of either `--raw` or `--flatten` from the helper's `kubectl` arguments.

```ts
test('normalizes embedded kubeconfig certificates', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'headlamp-kubeconfig-'));
  const kubeconfigPath = join(directory, 'config');

  try {
    await writeFile(
      kubeconfigPath,
      yaml.stringify(
        makeKubeconfig(
          { 'certificate-authority-data': Buffer.from('embedded-ca').toString('base64') },
          {
            'client-certificate-data': Buffer.from('embedded-cert').toString('base64'),
            'client-key-data': Buffer.from('embedded-key').toString('base64'),
          }
        )
      )
    );

    const encoded = await getBase64EncodedKubeconfig('embedded', kubeconfigPath);
    const normalized = yaml.parse(Buffer.from(encoded, 'base64').toString());

    expect(normalized.clusters[0].cluster).toMatchObject({
      'certificate-authority-data': 'ZW1iZWRkZWQtY2E=',
    });
    expect(normalized.users[0].user).toMatchObject({
      'client-certificate-data': 'ZW1iZWRkZWQtY2VydA==',
      'client-key-data': 'ZW1iZWRkZWQta2V5',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('normalizes certificate paths relative to the kubeconfig', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'headlamp-kubeconfig-'));
  const kubeconfigPath = join(directory, 'config');

  try {
    await Promise.all([
      writeFile(join(directory, 'ca.crt'), 'relative-ca'),
      writeFile(join(directory, 'client.crt'), 'relative-cert'),
      writeFile(join(directory, 'client.key'), 'relative-key'),
    ]);
    await writeFile(
      kubeconfigPath,
      yaml.stringify(
        makeKubeconfig(
          { 'certificate-authority': 'ca.crt' },
          { 'client-certificate': 'client.crt', 'client-key': 'client.key' }
        )
      )
    );

    const encoded = await getBase64EncodedKubeconfig('relative', kubeconfigPath);
    const normalized = yaml.parse(Buffer.from(encoded, 'base64').toString());

    expect(normalized.clusters[0].cluster).toMatchObject({
      'certificate-authority-data': 'cmVsYXRpdmUtY2E=',
    });
    expect(normalized.clusters[0].cluster).not.toHaveProperty('certificate-authority');
    expect(normalized.users[0].user).toMatchObject({
      'client-certificate-data': 'cmVsYXRpdmUtY2VydA==',
      'client-key-data': 'cmVsYXRpdmUta2V5',
    });
    expect(normalized.users[0].user).not.toHaveProperty('client-certificate');
    expect(normalized.users[0].user).not.toHaveProperty('client-key');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run the focused cases and verify RED**

With the E2E environment from `e2e-tests/README.md:15-89` available, run:

```bash
cd e2e-tests
npx playwright test tests/dynamicCluster.spec.ts --grep 'normalizes'
```

Expected: both cases fail against the existing helper. The embedded case fails because the existing helper attempts `fs.readFile(undefined)` after `kubectl` redacts data; the relative case fails because it opens `ca.crt` from the Playwright working directory. If either failure comes from syntax, navigation, or fixture setup, correct the test and rerun until the failure names the certificate-handling bug.

- [ ] **Step 4: Implement the minimal helper change**

Change the signature and command execution, then delete the three manual `readFile`/base64 blocks and their three `delete` statements. Keep the existing cluster/context/user renaming and final YAML/base64 conversion unchanged.

```ts
const getBase64EncodedKubeconfig = async (
  clusterName: string = 'dummy',
  kubeconfigPath?: string
): Promise<string> => {
  const { stdout } = await execFileAsync('kubectl', [
    ...(kubeconfigPath ? ['--kubeconfig', kubeconfigPath] : []),
    'config',
    'view',
    '--raw',
    '--flatten',
    '--output',
    'json',
  ]);

  const kubeconfig = JSON.parse(stdout);
  // Keep the existing rename, server override, current-context, YAML, and base64 code.
};
```

The absence of a `stderr` branch is intentional: `execFileAsync` rejects for a non-zero command, while warnings on stderr must not cause a successful command to return `undefined`.

- [ ] **Step 5: Run the focused cases and verify GREEN**

```bash
cd e2e-tests
npx playwright test tests/dynamicCluster.spec.ts --grep 'normalizes'
```

Expected: `2 passed`. Confirm there are no leaked temporary directories and no stderr warnings in the output.

- [ ] **Step 6: Run formatting and static checks**

From the repository root:

```bash
npx prettier --check e2e-tests/tests/dynamicCluster.spec.ts
cd e2e-tests && npx playwright test tests/dynamicCluster.spec.ts --list
```

Expected: Prettier reports the file is formatted, and Playwright successfully
loads the TypeScript spec and lists every test without executing browser setup.

- [ ] **Step 7: Run the full modified spec**

```bash
cd e2e-tests
npx playwright test tests/dynamicCluster.spec.ts
```

Expected: all existing dynamic-cluster cases and the two new regression cases pass.

- [ ] **Step 8: Review the implementation diff**

```bash
git diff --check
git diff -- e2e-tests/tests/dynamicCluster.spec.ts
git status --short
```

Expected: no whitespace errors; only `e2e-tests/tests/dynamicCluster.spec.ts` is modified; the diff contains no product, workflow, dependency, or documentation changes.

- [ ] **Step 9: Commit the implementation**

```bash
git add e2e-tests/tests/dynamicCluster.spec.ts
git commit -s -m "e2e-tests: Normalize dynamic cluster kubeconfigs"
```

Expected: one signed-off, atomic commit with a title under 72 characters.

---

### Task 2: Publish the verified draft pull request

**Files:**
- No additional file changes.

**Interfaces:**
- Consumes: the verified implementation commit from Task 1 and GitHub issue `kubernetes-sigs/headlamp#6939`.
- Produces: a pushed `codex/fix-dynamiccluster-kubeconfig` branch and draft PR targeting `kubernetes-sigs/headlamp:main`.

- [ ] **Step 1: Verify branch scope against upstream**

```bash
git fetch origin main
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: one implementation commit and one modified E2E spec; the design and plan commits from the planning branch are absent.

- [ ] **Step 2: Push the implementation branch**

```bash
git push -u fork codex/fix-dynamiccluster-kubeconfig
```

Expected: the branch is available at `areycruzer/headlamp`.

- [ ] **Step 3: Open a draft PR**

Use `.github/pull_request_template.md` with this content:

```markdown
## Summary

Normalize kubeconfigs in the dynamic-cluster E2E helper so embedded certificates and certificate paths relative to the kubeconfig both work.

## Related Issue

Fixes #6939

## Changes

- Use `kubectl config view --raw --flatten` instead of reading certificate files from the Playwright working directory.
- Add regression coverage for embedded certificate data and relative certificate paths.

## Steps to Test

1. Run `cd e2e-tests`.
2. Run `npx playwright test tests/dynamicCluster.spec.ts` with the documented E2E environment.
3. Confirm all dynamic-cluster tests pass.

## Screenshots (if applicable)

Not applicable; this only changes E2E kubeconfig preparation.

## Notes for the Reviewer

The helper delegates path resolution and certificate embedding to `kubectl`; no product or CI code changes are included.
```

Create it with `gh pr create --repo kubernetes-sigs/headlamp --head areycruzer:codex/fix-dynamiccluster-kubeconfig --base main --draft` and the body above.

- [ ] **Step 4: Inspect the published PR**

```bash
gh pr view --repo kubernetes-sigs/headlamp --json url,isDraft,title,body,files,commits,statusCheckRollup
```

Expected: the PR is a draft, targets upstream `main`, links issue #6939, contains only the intended file, and reports the local test results accurately.
