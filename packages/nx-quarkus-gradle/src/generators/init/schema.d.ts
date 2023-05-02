import { DSLType } from '@jnxplus/common/types';

export interface NxQuarkusGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
