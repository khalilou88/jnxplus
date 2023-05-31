import { LanguageType } from '@jnxplus/common';

export interface NxMicronautGradleLibGeneratorSchema {
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
}
