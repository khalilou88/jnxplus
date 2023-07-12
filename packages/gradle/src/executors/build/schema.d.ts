import { PackagingType } from '@jnxplus/common';

export interface BuildExecutorSchema {
  projectPath?: string;
  //TODO: make command mandatory
  command?: string;
  args?: string;
  //TODO: remove packaging option and make command mandatory
  //deprecated, use command to define your build command
  packaging?: PackagingType;
}
