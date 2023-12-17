export interface RunTaskExecutorSchema {
  task: string | string[];
  keepItRunning: boolean;
  outputDirectory?: string;
}
