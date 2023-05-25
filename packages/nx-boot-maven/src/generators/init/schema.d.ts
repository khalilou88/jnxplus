export interface NxBootMavenGeneratorSchema {
  javaVersion: string | number;
  groupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  dependencyManagementStrategy:
    | 'spring-boot-starter-parent'
    | 'spring-framework-bom'
    | 'none';
}
