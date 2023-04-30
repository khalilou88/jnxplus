import { LanguageType } from '../../utils/types';

export interface NxQuarkusMavenLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  simplePackageName?: boolean;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  parentProject?: string;
  projects?: string;
  skipStarterCode?: boolean;
}
