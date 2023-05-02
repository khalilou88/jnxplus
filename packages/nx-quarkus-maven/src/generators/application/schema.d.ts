import { LanguageType } from '@jnxplus/common/types';

export interface NxQuarkusMavenAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  configFormat: '.properties' | '.yml';
  parentProject?: string;
  skipStarterCode?: boolean;
  port?: string | number;
}
