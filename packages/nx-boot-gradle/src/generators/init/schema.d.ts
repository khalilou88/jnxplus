import { DSLType } from '../../utils/types';

export interface NxBootGradleGeneratorSchema {
  javaVersion: string;
  dsl: DSLType;
  rootProjectName: string;
}
