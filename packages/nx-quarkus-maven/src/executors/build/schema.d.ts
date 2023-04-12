import { BuildModeType, PackagingType } from '../../utils/types';

export interface BuildExecutorSchema {
  buildMode: BuildModeType;
  packaging: PackagingType;
  mvnArgs: string;
}
