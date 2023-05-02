import { MvnBuildCommandType } from '@jnxplus/common/types';

export interface BuildExecutorSchema {
  mvnArgs: string;
  mvnBuildCommand: MvnBuildCommandType;
  mvnBuildArgs: string;
  skipClean: boolean;
}
