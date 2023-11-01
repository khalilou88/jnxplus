export type LanguageType = 'java' | 'kotlin';
export type DSLType = 'groovy' | 'kotlin';
export type PackagingType = 'jar' | 'war';
export type LinterType = 'checkstyle' | 'pmd' | 'ktlint';
export type ProjectType = 'application' | 'library';
export type MvnBuildCommandType = 'compile' | 'package' | 'install';
export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';
export type GetVersionFunction = (dir: string) => string;

export type MavenPluginType = '@jnxplus/nx-maven';

export type GradlePluginType = '@jnxplus/nx-gradle';

export type CustomCli =
  | 'create-nx-maven-workspace'
  | 'create-nx-gradle-workspace';
