import { ProjectType } from '@jnxplus/common';

export interface NxMavenParentProjectGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  projectType: ProjectType;
  groupId: string;
  projectVersion?: string;
  parentProject?:
    | 'spring-boot-starter-parent'
    | 'root-project'
    | 'artifact-id'
    | 'none';
  parentProjectArtifactId?: string;
  aggregator?: string;
}
