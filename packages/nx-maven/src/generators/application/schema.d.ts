import { FrameworkType, LanguageType, PackagingType } from '@jnxplus/common';

export interface NxMavenAppGeneratorSchema {
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
  parentProject: string;
  aggregatorProject?: string;
  minimal?: boolean;
  port?: string | number;
  framework?: FrameworkType;
  skipFormat?: boolean;
}
