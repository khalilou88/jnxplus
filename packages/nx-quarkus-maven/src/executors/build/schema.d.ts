import { mvnBuildCommandType } from '../../utils/types';

export interface BuildExecutorSchema {
  mvnArgs: string;
  mvnBuildCommand: mvnBuildCommandType;
  mvnBuildArgs: string;
}
