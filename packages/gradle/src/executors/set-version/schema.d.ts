export interface SetVersionExecutorSchema {
  tag: string;
  version: string;
  commitMessageFormat: string;
  postTargets: string[];
}
