import { MvnBuildCommandType } from '@jnxplus/common';

export interface BuildExecutorSchema {
  framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  mvnArgs: string;
  mvnBuildCommand: MvnBuildCommandType;
  mvnBuildArgs: string;
  skipClean: boolean;
}
