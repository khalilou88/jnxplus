export interface ServeExecutorSchema {
  projectPath?: string;
  //TODO: make command mandatory
  command?: string;
  //TODO: remove args and use only command
  args?: string;
}
