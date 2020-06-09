# action-dependabot-labels javascript action

> labels dependabot pull requests

## Synopsis

Since native dependabot implementation has no automerge Feature (in beta)
We need to determine the dependency update version level, so we can decide
whether to automerge the PR or not.

This action uses the Title of the PR to determine version level and labels
the PR with

- major
- minor
- patch

for example:

- `chore(deps-dev): bump @foo/bar from 1.13.0 to 1.13.1`: patch
- `chore(deps-dev): bump @foo/bar from 1.13.0 to 1.14.1`: minor
- `chore(deps-dev): bump @foo/bar from 1.13.0 to 2.0.1`: major

## Inputs

### `token`

**Required** Github Api token with repo scope, e.g. `secrets.GITHUB_TOKEN`.

## Outputs

### `result`

Result message.

## Example usage

```yml
name: "Label Dependabot PR"

on:
  pull_request:
    types:
      - labeled
      - unlabeled
      - synchronize
      - opened
      - edited
      - ready_for_review
      - reopened
      - unlocked

jobs:
  foo_bar:
    runs-on: ubuntu-latest
    steps:
      - uses: jurijzahn8019/action-dependabot-labels
        env:
          # This way you can enable debug output
          DEBUG: action-dependabot-labels:*
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

This way you can use an Automerge Action and say do not merge `major`

```yml
name: "Automerge PR"

on:
  pull_request:
    types:
      - labeled
      - unlabeled
      - synchronize
      - opened
      - edited
      - ready_for_review
      - reopened
      - unlocked

jobs:
  foo_bar:
    runs-on: ubuntu-latest
    steps:
      - uses: jurijzahn8019/action-dependabot-labels
        with:
          token: ${{ secrets.GITHUB_TOKEN }

      - uses: "pascalgn/automerge-action@v0.8.4"
        env:
          GITHUB_TOKEN: "${{ secrets.TOKEN_GITHUB }}"
          MERGE_LABELS: "automerge,!major"
          MERGE_METHOD: squash
          MERGE_COMMIT_MESSAGE: pull-request-title-and-description
          MERGE_DELETE_BRANCH: true
          UPDATE_LABELS: "update"
          UPDATE_METHOD: rebase
```
