import { ImageType } from '@jnxplus/common';

export interface BuildImageExecutorSchema {
  imageType: ImageType;
  imageNamePrefix: string;
  imageNameSuffix: string;
}
