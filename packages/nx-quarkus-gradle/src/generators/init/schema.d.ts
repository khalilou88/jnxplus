import { DSLType } from '../../utils/types';

export interface NxQuarkusGradleGeneratorSchema {
  javaVersion: string | number;
  dsl: DSLType;
  rootProjectName: string;
}
