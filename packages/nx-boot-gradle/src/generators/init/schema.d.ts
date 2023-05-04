import { DSLType } from '@jnxplus/common';

export interface NxBootGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
