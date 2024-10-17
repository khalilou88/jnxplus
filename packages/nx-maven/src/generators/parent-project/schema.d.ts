import { FrameworkType2, ProjectType } from '@jnxplus/common';

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
  framework?: FrameworkType2;
  language: 'java' | 'kotlin' | 'java & kotlin';
  skipFormat?: boolean;
}
