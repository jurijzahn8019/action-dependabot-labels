# action-dependabot-labels

labels dependabot pull requests

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
      - uses: actions/checkout@v2
      - uses: jurijzahn8019/action-dependabot-labels
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```
