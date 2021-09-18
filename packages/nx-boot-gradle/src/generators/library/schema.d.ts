import { LanguageType } from '../../utils/types';

export interface NxBootGradleLibGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  language: LanguageType;
  groupId: string;
  projectVersion: string;
  projects?: string;
}
