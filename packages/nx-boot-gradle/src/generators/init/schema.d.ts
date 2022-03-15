import { DSLType } from '../../utils/types';

export interface NxBootGradleGeneratorSchema {
  javaVersion: number;
  dsl: DSLType;
  rootProjectName: string;
}
