import { LanguageType, PackagingType } from '@jnxplus/common';

export interface NxGradleAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  packaging: PackagingType;
  configFormat: '.properties' | '.yml';
  minimal?: boolean;
  port?: string | number;
  framework?: 'spring-boot' | 'quarkus' | 'micronaut' | 'none';
}
