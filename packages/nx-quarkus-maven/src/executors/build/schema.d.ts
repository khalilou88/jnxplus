import { MvnBuildCommandType } from '../../utils/types';

export interface BuildExecutorSchema {
  mvnArgs: string;
  mvnBuildCommand: MvnBuildCommandType;
  mvnBuildArgs: string;
  skipClean: boolean;
}
