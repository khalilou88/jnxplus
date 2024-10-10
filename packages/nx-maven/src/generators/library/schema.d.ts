import { FrameworkType, LanguageType } from '@jnxplus/common';

export interface NxMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  parentProject: string;
  aggregatorProject?: string;
  projects?: string;
  skipStarterCode?: boolean;
  framework?: FrameworkType;
  skipFormat?: boolean;
}
