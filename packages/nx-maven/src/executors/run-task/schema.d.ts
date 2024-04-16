export interface RunTaskExecutorSchema {
  task: string | string[];
  outputDirLocalRepo?: string;
  skipProject?: boolean;
  cwd?: string;
  skipExecutor?: boolean;
}
