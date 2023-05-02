import { DSLType } from '@jnxplus/common';

export interface NxQuarkusGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
