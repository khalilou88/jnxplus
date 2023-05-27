import { ImageType } from '../../../.';

export interface BuildImageExecutorSchema {
  imageType: ImageType;
  imageNamePrefix: string;
  imageNameSuffix: string;
}
