import { DSLType, PresetType } from '@jnxplus/common';

export interface NxGradleInitGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
  gradleRootDirectory: string;
  preset: PresetType;
  skipWrapper?: boolean;
  versionManagement: 'properties' | 'version-catalog';
}
