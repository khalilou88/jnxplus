import { DependencyManagementType } from '@jnxplus/common';

export interface NxMavenInitGeneratorSchema {
  javaVersion: string | number;
  groupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  mavenRootDirectory: string;
  dependencyManagement: DependencyManagementType;
  skipWrapper?: boolean;
  localRepoRelativePath: string;
  skipFormat?: boolean;
}
