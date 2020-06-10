import { SemVer, ReleaseType } from "semver";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { LabelConfig } from "./config";
export declare function matchTitle(title: string): {
    from: SemVer;
    to: SemVer;
} | undefined;
export declare function verDiff(from: SemVer, to: SemVer): ReleaseType | null;
export declare function getEvent(): Promise<{
    pull_request?: {
        number?: number;
    };
}>;
export declare function buildPlan(repoLabels: RestEndpointMethodTypes["issues"]["listLabelsForRepo"]["response"]["data"], pullLabels: RestEndpointMethodTypes["issues"]["listLabelsOnIssue"]["response"]["data"], setLabels: LabelConfig[]): {
    add: string[];
    remove: string[];
    create: LabelConfig[];
};
