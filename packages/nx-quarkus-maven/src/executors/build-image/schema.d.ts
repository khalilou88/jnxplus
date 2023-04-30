export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';

export interface BuildImageExecutorSchema {
  imageType: ImageType;
  imageNamePrefix: string;
  imageNameSuffix: string;
}
