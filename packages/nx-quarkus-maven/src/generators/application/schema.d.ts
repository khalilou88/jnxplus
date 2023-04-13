import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxBootMavenAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  configFormat: '.properties' | '.yml';
}
