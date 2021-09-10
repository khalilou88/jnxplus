export interface NxBootGradleGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;

  groupId: string;
  projectVersion: string;
  packageName: string;
  applicationClassName: string;
  applicationClassDirectory: string;
}
