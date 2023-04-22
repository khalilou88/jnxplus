import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxBootMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  parentProject: string;
  projects?: string;
}
