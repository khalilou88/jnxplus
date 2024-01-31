export interface RunTaskExecutorSchema {
  task: string | string[];
  keepItRunning?: boolean;
  outputDirLocalRepo?: string;
  skipProject?: boolean;
  cwd?: string;
}
