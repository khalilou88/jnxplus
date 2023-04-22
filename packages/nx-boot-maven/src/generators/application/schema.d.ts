import {
  LanguageType,
  PackageNameType,
  PackagingType,
} from '../../utils/types';

export interface NxBootMavenAppGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  packaging: PackagingType;
  configFormat: '.properties' | '.yml';
  parentProject: string;
}
