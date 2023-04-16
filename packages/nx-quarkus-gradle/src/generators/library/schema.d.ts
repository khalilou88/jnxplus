import { LanguageType, PackageNameType } from '../../utils/types';

export interface NxQuarkusGradleLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  packageNameType: PackageNameType;
  projectVersion: string;
  projects?: string;
}
