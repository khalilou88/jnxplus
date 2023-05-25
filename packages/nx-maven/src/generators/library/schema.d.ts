import { LanguageType } from '@jnxplus/common';

export interface NxMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  parentProject?: string;
  aggregator?: string;
  projects?: string;
  skipStarterCode?: boolean;
}
