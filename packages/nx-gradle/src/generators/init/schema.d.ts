import { DSLType } from '@jnxplus/common';

export interface NxGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
  preset:
    | 'spring-boot'
    | 'quarkus'
    | 'micronaut'
    | 'kotlin-multiplatform'
    | 'none';
}
