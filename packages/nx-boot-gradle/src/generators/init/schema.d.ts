import { DSLType } from '../../utils/types';

export interface NxBootGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
