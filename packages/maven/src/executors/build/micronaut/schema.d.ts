import { MvnBuildCommandType } from '@jnxplus/common';

export interface BuildExecutorSchema {
  mvnArgs: string;
  mvnBuildCommand: MvnBuildCommandType;
  mvnBuildArgs: string;
  skipClean: boolean;
}
