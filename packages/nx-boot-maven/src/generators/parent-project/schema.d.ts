import { ProjectType } from '@jnxplus/common/types';

export interface NxBootMavenParentProjectGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  projectType: ProjectType;
  groupId: string;
  projectVersion?: string;
  parentProject?: string;
}
