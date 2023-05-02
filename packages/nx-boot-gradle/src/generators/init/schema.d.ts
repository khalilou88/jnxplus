import { DSLType } from '@jnxplus/common/types';

export interface NxBootGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
