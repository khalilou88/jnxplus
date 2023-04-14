import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxQuarkusMavenAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  configFormat: '.properties' | '.yml';
}
