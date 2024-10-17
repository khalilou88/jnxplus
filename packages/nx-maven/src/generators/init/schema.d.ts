export interface NxMavenInitGeneratorSchema {
  javaVersion: string | number;
  aggregatorProjectGroupId: string;
  aggregatorProjectName: string;
  aggregatorProjectVersion: string;
  mavenRootDirectory: string;
  skipWrapper?: boolean;
  localRepoRelativePath: string;
  skipFormat?: boolean;
  formatter?: 'none' | 'prettier';
}
