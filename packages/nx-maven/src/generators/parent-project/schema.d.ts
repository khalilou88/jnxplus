import { DependencyManagementType, ProjectType } from '@jnxplus/common';

export interface NxMavenParentProjectGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  simpleName?: boolean;
  projectType: ProjectType;
  groupId: string;
  projectVersion?: string;
  parentProject: string;
  aggregatorProject?: string;
  dependencyManagement?: DependencyManagementType;
  language: 'java' | 'kotlin' | 'java & kotlin';
  skipFormat?: boolean;
}
