export interface LabelConfig {
  name: string;
  color: string;
  description: string;
}

export const Labels: Record<string, LabelConfig[]> = {
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
