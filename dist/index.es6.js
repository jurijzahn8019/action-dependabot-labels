import { getInput, setOutput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import debug from 'debug';
import { diff, coerce } from 'semver';
import { promises } from 'fs';

const { readFile } = promises;
const matchPattern = /\w+\([\w-]+\):\s+bump\s+\S+\s+from\s+v?(?<from>[\d.]+)\s+to\s+v?(?<to>[\d.]+)/;
const Labels = {
    major: {
        color: "0D3184",
        description: "minor version dependency update",
    },
    minor: {
        color: "365BB0",
        description: "minor version dependency update",
    },
    patch: {
        color: "365BB0",
        description: "minor version dependency update",
    },
};
function matchTitle(title) {
    const match = matchPattern.exec(title);
    if ((match === null || match === void 0 ? void 0 : match.groups) && match.groups.from && match.groups.to) {
        const res = {
            from: coerce(match.groups.from),
            to: coerce(match.groups.to),
        };
        return res.from && res.to ? { from: res.from, to: res.to } : undefined;
    }
    return undefined;
}
function verDiff(from, to) {
    return diff(from, to);
}
async function getEvent() {
    return JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
}
function buildPlan(repoLabels, pullLabels, setLabels) {
    const managedLabels = Object.keys(Labels);
    const remove = pullLabels
        .filter((pl) => managedLabels.includes(pl.name) && !setLabels.includes(pl.name))
        .map((pl) => pl.name);
    const add = setLabels.filter((sl) => !pullLabels.find((pl) => pl.name === sl));
    const create = add.filter((l) => !repoLabels.find((rl) => rl.name === l));
    return { add, remove, create };
}

/* eslint-disable @typescript-eslint/camelcase */
const dbg = debug("action-dependabot-labels:index");
async function run() {
    dbg("Check PR Title and label PR!");
    try {
        const token = getInput("token", { required: true });
        const event = await getEvent();
        const client = getOctokit(token);
        const pr = (await client.pulls.get({
            ...context.repo,
            pull_number: event.pull_request.number,
        })).data;
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
        const labels = (await client.issues.listLabelsOnIssue({
            ...context.repo,
            issue_number: pr.number,
        })).data;
        const repoLabels = (await client.issues.listLabelsForRepo(context.repo))
            .data;
        const plan = buildPlan(repoLabels, labels, [version]);
        await Promise.all(plan.create.map(async (l) => {
            const lConfig = Labels[l];
            await client.issues.createLabel({
                ...context.repo,
                ...lConfig,
                name: l,
            });
        }));
        await Promise.all(plan.remove.map((l) => {
            return client.issues.removeLabel({
                ...context.repo,
                issue_number: pr.number,
                name: l,
            });
        }));
        await client.issues.addLabels({
            ...context.repo,
            issue_number: pr.number,
            labels: plan.add,
        });
    }
    catch (e) {
        setFailed(e.message);
    }
}
var index = run();

export default index;
export { run };
