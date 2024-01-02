import { TargetConfiguration } from '@nx/devkit';

export type LanguageType = 'java' | 'kotlin';
export type DSLType = 'groovy' | 'kotlin';
export type PackagingType = 'jar' | 'war';
export type ProjectType = 'application' | 'library';
export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';
export type MavenPluginType = '@jnxplus/nx-maven';
export type GradlePluginType = '@jnxplus/nx-gradle';
export type CustomCli =
  | 'create-nx-maven-workspace'
  | 'create-nx-gradle-workspace';
export type TargetsType = {
  [targetName: string]: TargetConfiguration;
};
