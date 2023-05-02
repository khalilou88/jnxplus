import { LanguageType } from '@jnxplus/common/types';

export interface NxQuarkusGradleLibGeneratorSchema {
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
