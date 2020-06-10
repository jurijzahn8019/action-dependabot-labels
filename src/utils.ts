import { SemVer, coerce, diff, ReleaseType } from "semver";
import { promises as fs } from "fs";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { Labels, LabelConfig } from "./config";

const { readFile } = fs;
const matchPattern = /\w+\([\w-]+\):\s+bump\s+\S+\s+from\s+v?(?<from>[\d.]+)\s+to\s+v?(?<to>[\d.]+)/;

export function matchTitle(
  title: string
): { from: SemVer; to: SemVer } | undefined {
  const match = matchPattern.exec(title);
  if (match?.groups && match.groups.from && match.groups.to) {
    const res = {
      from: coerce(match.groups.from),
      to: coerce(match.groups.to),
    };
    return res.from && res.to ? { from: res.from, to: res.to } : undefined;
  }

  return undefined;
}

export function verDiff(from: SemVer, to: SemVer): ReleaseType | null {
  return diff(from, to);
}

export async function getEvent(): Promise<{
  pull_request?: { number?: number };
}> {
  return JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH as string, "utf8")
  );
}

export function buildPlan(
  repoLabels: RestEndpointMethodTypes["issues"]["listLabelsForRepo"]["response"]["data"],
  pullLabels: RestEndpointMethodTypes["issues"]["listLabelsOnIssue"]["response"]["data"],
  setLabels: LabelConfig[]
): {
  add: string[];
  remove: string[];
  create: LabelConfig[];
} {
  const managedLabels = Object.entries(Labels)
    .map((lc) => lc[1])
    .flat(1);
  const remove = pullLabels
    .filter(
      (pl) =>
        managedLabels.find((ml) => ml.name === pl.name) &&
        !setLabels.find((sl) => sl.name === pl.name)
    )
    .map((pl) => pl.name);

  const add = setLabels
    .filter((sl) => !pullLabels.find((pl) => pl.name === sl.name))
    .map((sl) => sl.name);

  const create = setLabels.filter(
    (al) => !repoLabels.find((rl) => rl.name === al.name)
  );

  return { add, remove, create };
}
