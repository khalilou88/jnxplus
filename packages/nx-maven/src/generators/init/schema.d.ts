export interface NxMavenInitGeneratorSchema {
  javaVersion: string | number;
  groupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  mavenRootDirectory: string;
  dependencyManagement:
    | 'bom'
    | 'spring-boot-parent-pom'
    | 'micronaut-parent-pom';
  localRepositoryLocation: 'default' | 'workspace';
  skipWrapper?: boolean;
}
