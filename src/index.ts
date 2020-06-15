/* eslint-disable camelcase */
import { getInput, setFailed, setOutput } from "@actions/core";
import { getOctokit, context } from "@actions/github";
import debug from "debug";
import { matchTitle, getEvent, buildPlan, verDiff } from "./utils";
import { Labels } from "./config";

const dbg = debug("action-dependabot-labels:index");

export async function run(): Promise<void> {
  dbg("Check PR Title and label PR!");
  try {
    dbg("Retrieve inputs, and event data");
    const token = getInput("token", { required: true });
    const event = await getEvent();
    const client = getOctokit(token);

    // dbg("Process Event: %j", event);
    if (event?.pull_request?.number === undefined) {
      setOutput("result", "no pr info provided");
      return;
    }

    dbg("Fetch pull request data");
    const pr = (
      await client.pulls.get({
        ...context.repo,
        pull_number: event.pull_request.number,
      })
    ).data;

    dbg("Process pull request title: %s", pr.title);
    const match = matchTitle(pr.title);
    if (!match) {
      setOutput("result", "not dependabot");
      return;
    }

    dbg(
      "Calculate version diff from: %s to: %s",
      match.from.version,
      match.to.version
    );
    const version = verDiff(match.from, match.to);
    if (!version) {
      setOutput("result", "not semver range");
      return;
    }

    dbg("Get Labels for version: %s", version);
    const labelConfig = Labels[version];
    if (!version) {
      setOutput("result", "version mismatch");
      return;
    }

    dbg("Fetch pull and repo labels");
    const pullLabels = (
      await client.issues.listLabelsOnIssue({
        ...context.repo,
        issue_number: pr.number,
      })
    ).data;
    dbg("Pull labels: %j", pullLabels);

    const repoLabels = (await client.issues.listLabelsForRepo(context.repo))
      .data;
    dbg("Repo labels: %j", repoLabels);

    dbg("Build Pland to process labels: %j", labelConfig);
    const plan = buildPlan(repoLabels, pullLabels, labelConfig);

    dbg("Create labels on repo: %j", plan.create);
    await Promise.all(
      plan.create.map(async (l) => {
        await client.issues.createLabel({ ...context.repo, ...l });
      })
    );

    dbg("Remove labels from PR: %j", plan.remove);
    await Promise.all(
      plan.remove.map((l) => {
        return client.issues.removeLabel({
          ...context.repo,
          issue_number: pr.number,
          name: l,
        });
      })
    );

    dbg("Add labels to PR: %j", plan.add);
    if (plan.add.length > 0) {
      await client.issues.addLabels({
        ...context.repo,
        issue_number: pr.number,
        labels: plan.add,
      });
    }
  } catch (e) {
    dbg("Failed:", e);
    setFailed(e.message);
  }
}

export default run();
