import { PackagingType } from '../../utils/types';

export interface NxBootGradleGeneratorSchema {
  name: string;
  tags?: string;
  directory?: string;
  groupId: string;
  projectVersion: string;
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  packaging: PackagingType;
}
