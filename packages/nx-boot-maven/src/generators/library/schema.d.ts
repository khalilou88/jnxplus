import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxBootMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  projects?: string;
}
