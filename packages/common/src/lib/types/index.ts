import { TargetConfiguration } from '@nx/devkit';

export type LanguageType = 'java' | 'kotlin';
export type DSLType = 'groovy' | 'kotlin';
export type PackagingType = 'jar' | 'war';
export type ProjectType = 'application' | 'library';
export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';
export type CustomCli =
  | 'create-nx-maven-workspace'
  | 'create-nx-gradle-workspace';
export type TargetsType = {
  [targetName: string]: TargetConfiguration;
};
export type FrameworkType = 'spring-boot' | 'quarkus' | 'micronaut' | 'none';
