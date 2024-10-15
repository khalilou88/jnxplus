import { DependencyManagementType } from '@jnxplus/common';

export interface NxMavenInitGeneratorSchema {
  javaVersion: string | number;
  aggregatorProjectGroupId: string;
  aggregatorProjectName: string;
  aggregatorProjectVersion: string;
  mavenRootDirectory: string;
  dependencyManagement: DependencyManagementType;
  skipWrapper?: boolean;
  localRepoRelativePath: string;
  skipFormat?: boolean;
  formatter?: 'none' | 'prettier';
}
