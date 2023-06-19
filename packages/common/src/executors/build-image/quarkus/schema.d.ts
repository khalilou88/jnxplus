import { ImageType } from '../../../.';

export interface QuarkusBuildImageExecutorSchema {
  imageType: ImageType;
  imageNamePrefix: string;
  imageNameSuffix: string;
}
