import { LanguageType } from '@jnxplus/common';

export interface NxGradleLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  projects?: string;
  skipStarterCode?: boolean;
  framework?: 'spring-boot' | 'quarkus' | 'micronaut' | 'none';
}
