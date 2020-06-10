'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var core = require('@actions/core');
var github = require('@actions/github');
var debug = _interopDefault(require('debug'));
var semver = require('semver');
var fs = require('fs');

const Labels = {
    major: [
        {
            name: "dependency: major",
            color: "0D3184",
            description: "minor version dependency update",
        },
    ],
    minor: [
        {
            name: "pull: automerge",
            color: "6F4D8F",
            description: "pull request should be automatically merged",
        },
        {
            name: "dependency: minor",
            color: "365BB0",
            description: "minor version dependency update",
        },
    ],
    patch: [
        {
            name: "pull: automerge",
            color: "6F4D8F",
            description: "pull request should be automatically merged",
        },
        {
            name: "dependency: patch",
            color: "365BB0",
            description: "minor version dependency update",
        },
    ],
};

const { readFile } = fs.promises;
const matchPattern = /\w+\([\w-]+\):\s+bump\s+\S+\s+from\s+v?(?<from>[\d.]+)\s+to\s+v?(?<to>[\d.]+)/;
function matchTitle(title) {
    const match = matchPattern.exec(title);
    if ((match === null || match === void 0 ? void 0 : match.groups) && match.groups.from && match.groups.to) {
        const res = {
            from: semver.coerce(match.groups.from),
            to: semver.coerce(match.groups.to),
        };
        return res.from && res.to ? { from: res.from, to: res.to } : undefined;
    }
    return undefined;
}
function verDiff(from, to) {
    return semver.diff(from, to);
}
async function getEvent() {
    return JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
}
function buildPlan(repoLabels, pullLabels, setLabels) {
    const managedLabels = Object.entries(Labels)
        .map((lc) => lc[1])
        .flat(1);
    const remove = pullLabels
        .filter((pl) => managedLabels.find((ml) => ml.name === pl.name) &&
        !setLabels.find((sl) => sl.name === pl.name))
        .map((pl) => pl.name);
    const add = setLabels
        .filter((sl) => !pullLabels.find((pl) => pl.name === sl.name))
        .map((sl) => sl.name);
    const create = setLabels.filter((al) => !repoLabels.find((rl) => rl.name === al.name));
    return { add, remove, create };
}

/* eslint-disable @typescript-eslint/camelcase */
const dbg = debug("action-dependabot-labels:index");
async function run() {
    var _a;
    dbg("Check PR Title and label PR!");
    try {
        dbg("Retrieve inputs, and event data");
        const token = core.getInput("token", { required: true });
        const event = await getEvent();
        const client = github.getOctokit(token);
        dbg("Process Event: %j", event);
        if (((_a = event === null || event === void 0 ? void 0 : event.pull_request) === null || _a === void 0 ? void 0 : _a.number) === undefined) {
            core.setOutput("result", "no pr info provided");
            return;
        }
        dbg("Fetch pull request data");
        const pr = (await client.pulls.get({
            ...github.context.repo,
            pull_number: event.pull_request.number,
        })).data;
        dbg("Process pull request title: %s", pr.title);
        const match = matchTitle(pr.title);
        if (!match) {
            core.setOutput("result", "not dependabot");
            return;
        }
        dbg("Calculate version diff from: %s to: %s", match.from.version, match.to.version);
        const version = verDiff(match.from, match.to);
        if (!version) {
            core.setOutput("result", "not semver range");
            return;
        }
        dbg("Get Labels for version: %s", version);
        const labelConfig = Labels[version];
        if (!version) {
            core.setOutput("result", "version mismatch");
            return;
        }
        dbg("Fetch issue and repo labels");
        const labels = (await client.issues.listLabelsOnIssue({
            ...github.context.repo,
            issue_number: pr.number,
        })).data;
        const repoLabels = (await client.issues.listLabelsForRepo(github.context.repo))
            .data;
        dbg("Build Pland to process labels: %j", labelConfig);
        const plan = buildPlan(repoLabels, labels, labelConfig);
        dbg("Create labels on repo: %j", plan.create);
        await Promise.all(plan.create.map(async (l) => {
            await client.issues.createLabel({ ...github.context.repo, ...l });
        }));
        dbg("Remove labels from PR: %j", plan.remove);
        await Promise.all(plan.remove.map((l) => {
            return client.issues.removeLabel({
                ...github.context.repo,
                issue_number: pr.number,
                name: l,
            });
        }));
        dbg("Add labels to PR: %j", plan.add);
        if (plan.add.length > 0) {
            await client.issues.addLabels({
                ...github.context.repo,
                issue_number: pr.number,
                labels: plan.add,
            });
        }
    }
    catch (e) {
        dbg("Failed:", e);
        core.setFailed(e.message);
    }
}
var index = run();

exports.default = index;
exports.run = run;
