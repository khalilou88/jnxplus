export interface NxMavenGeneratorSchema {
  javaVersion: string | number;
  groupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  dependencyManagement:
    | 'bom'
    | 'spring-boot-parent-pom'
    | 'micronaut-parent-pom';
  skipWrapper?: boolean;
  useSubfolder?: boolean;
}
