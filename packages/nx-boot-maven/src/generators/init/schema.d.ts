import { DSLType } from '../../utils/types';

export interface NxBootMavenGeneratorSchema {
  javaVersion: string;
  dsl: DSLType;
  rootProjectName: string;
  groupId: string;
  projectVersion: string;
}
