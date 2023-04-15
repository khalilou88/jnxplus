export type DockerfileType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';

export interface BuildImageExecutorSchema {
  dockerfile: DockerfileType;
  imageNamePrefix: string;
  imageNameSuffix: string;
}
