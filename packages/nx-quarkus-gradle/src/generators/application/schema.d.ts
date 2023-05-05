import { LanguageType } from '@jnxplus/common';

export interface NxQuarkusGradleAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  configFormat: '.properties' | '.yml';
  skipStarterCode?: boolean;
  port: string | number;
}
