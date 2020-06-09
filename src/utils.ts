import { SemVer, coerce, diff, ReleaseType } from "semver";
import { promises as fs } from "fs";
import { RestEndpointMethodTypes } from "@octokit/rest";

const { readFile } = fs;
const matchPattern = /\w+\([\w-]+\):\s+bump\s+\S+\s+from\s+v?(?<from>[\d.]+)\s+to\s+v?(?<to>[\d.]+)/;
export const Labels: Record<string, { color: string; description: string }> = {
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
  setLabels: string[]
): {
  add: string[];
  remove: string[];
  create: string[];
} {
  const managedLabels = Object.keys(Labels);
  const remove = pullLabels
    .filter(
      (pl) => managedLabels.includes(pl.name) && !setLabels.includes(pl.name)
    )
    .map((pl) => pl.name);

  const add = setLabels.filter(
    (sl) => !pullLabels.find((pl) => pl.name === sl)
  );

  const create = add.filter((l) => !repoLabels.find((rl) => rl.name === l));

  return { add, remove, create };
}
