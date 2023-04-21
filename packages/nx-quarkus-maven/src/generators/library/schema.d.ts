import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxQuarkusMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  parentProject: string;
  projects?: string;
}
