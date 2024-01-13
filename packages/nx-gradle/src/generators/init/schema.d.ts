import { DSLType } from '@jnxplus/common';

export interface NxGradleInitGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
  gradleRootDirectory: string;
  preset: 'spring-boot' | 'quarkus' | 'micronaut' | 'kmp' | 'none';
  skipWrapper?: boolean;
}
