import { TargetConfiguration } from '@nx/devkit';

export type LanguageType = 'java' | 'kotlin';
export type DSLType = 'groovy' | 'kotlin';
export type PackagingType = 'jar' | 'war';
export type ProjectType = 'application' | 'library';
export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';
export type CustomCli =
  | 'create-nx-maven-workspace'
  | 'create-nx-gradle-workspace';
export type TargetsType = Record<string, TargetConfiguration>;
export type FrameworkType = 'spring-boot' | 'quarkus' | 'micronaut' | 'none';
export type PresetType = 'spring-boot' | 'quarkus' | 'micronaut' | 'none';
export type DependencyManagementType =
  | 'bom'
  | 'spring-boot-parent-pom'
  | 'micronaut-parent-pom';
export type VersionManagementType = 'properties' | 'version-catalog';
export interface TemplateOptionsType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}
type NxMavenTarget = {
  defaultName: string;
  customName: string;
};
export type NxMavenPluginOptions = {
  targets?: NxMavenTarget[];
  mavenRootDirectory: string;
  localRepoRelativePath: string;
};
export type NxGradlePluginOptions = { gradleRootDirectory: string };
