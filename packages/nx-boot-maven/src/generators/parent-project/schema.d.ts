import { ProjectType } from '../../utils/types';

export interface NxBootMavenParentProjectGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  projectType: ProjectType;
  groupId: string;
  projectVersion: string;
  parentProject: string;
}
