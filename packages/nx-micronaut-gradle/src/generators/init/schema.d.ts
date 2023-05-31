import { DSLType } from '@jnxplus/common';

export interface NxMicronautGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
