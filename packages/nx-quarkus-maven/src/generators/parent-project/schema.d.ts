import { ProjectType } from '../../utils/types';

export interface NxQuarkusMavenParentProjectGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  projectType: ProjectType;
  groupId: string;
  projectVersion: string;
  parentProject: string;
}
