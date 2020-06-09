/* eslint-disable @typescript-eslint/camelcase */
import { getInput, setFailed, setOutput } from "@actions/core";
import { getOctokit, context } from "@actions/github";
import debug from "debug";
import { matchTitle, getEvent, buildPlan, verDiff, Labels } from "./utils";

const dbg = debug("action-dependabot-labels:index");

export async function run(): Promise<void> {
  try {
    const token = getInput("token", { required: true });
    const event = await getEvent();
    const client = getOctokit(token);

    const pr = (
      await client.pulls.get({
        ...context.repo,
        pull_number: event.pull_request.number,
      })
    ).data;

    const match = matchTitle(pr.title);
    if (!match) {
      setOutput("result", "not dependabot");
      return;
    }

    const version = verDiff(match.from, match.to);
    if (!version) {
      setOutput("result", "not semver range");
      return;
    }

    const labels = (
      await client.issues.listLabelsOnIssue({
        ...context.repo,
        issue_number: pr.number,
      })
    ).data;

    const repoLabels = (await client.issues.listLabelsForRepo(context.repo))
      .data;

    const plan = buildPlan(repoLabels, labels, [version]);

    await Promise.all(
      plan.create.map(async (l) => {
        const lConfig = Labels[l];
        await client.issues.createLabel({
          ...context.repo,
          ...lConfig,
          name: l,
        });
      })
    );

    await Promise.all(
      plan.remove.map((l) => {
        return client.issues.removeLabel({
          ...context.repo,
          issue_number: pr.number,
          name: l,
        });
      })
    );

    await client.issues.addLabels({
      ...context.repo,
      issue_number: pr.number,
      labels: plan.add,
    });
  } catch (e) {
    setFailed(e.message);
  }
}

export default run();
