# Dynamic Cluster Kubeconfig Normalization Design

## Problem

The dynamic-cluster end-to-end helper assumes that Kubernetes certificates are
always represented by file paths. That assumption fails for two valid
kubeconfig forms:

- Embedded certificate data is redacted by a normal `kubectl config view`, so
  the helper receives no path to read.
- Relative certificate paths are resolved from the Playwright working
  directory instead of from the kubeconfig file's directory.

Both failures occur before the dynamic-cluster behavior under test is reached.

## Scope

Update `e2e-tests/tests/dynamicCluster.spec.ts` so the helper accepts embedded
certificate data and relative certificate paths. Add regression coverage for
both forms.

This change will not modify Headlamp product code, CI workflows, dependencies,
or the documented test setup.

## Approach

Ask `kubectl` to perform kubeconfig normalization:

```text
input kubeconfig
  -> kubectl config view --raw --flatten --output json
  -> self-contained kubeconfig with *-data fields
  -> rename the synthetic cluster/context/user
  -> YAML
  -> base64 value used by the E2E test
```

The helper will stop opening certificate files itself. `--raw` preserves
embedded credentials, and `--flatten` resolves file references relative to the
kubeconfig and embeds their contents. An optional kubeconfig path will let the
regression tests supply isolated fixtures without changing the user's active
kubeconfig.

Use argument-based process execution for the optional path rather than
constructing a shell command.

## Error handling

Command failures should reject with the original `kubectl` error. The helper
should not silently continue with an incomplete kubeconfig.

## Tests

Add two focused cases using temporary kubeconfigs:

1. An embedded-data kubeconfig remains self-contained and produces the expected
   `certificate-authority-data`, `client-certificate-data`, and
   `client-key-data` fields.
2. A kubeconfig whose certificate paths are relative to its own directory is
   flattened successfully and produces those same data fields without path
   fields.

Temporary files will be removed after each test. The existing dynamic-cluster
tests will continue to exercise the default active-kubeconfig path.

## Expected patch

The implementation patch should be limited to
`e2e-tests/tests/dynamicCluster.spec.ts`. Screenshots are not applicable because
the fix changes test setup rather than UI behavior.
