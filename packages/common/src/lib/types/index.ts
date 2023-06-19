export type LanguageType = 'java' | 'kotlin';
export type DSLType = 'groovy' | 'kotlin';
export type PackagingType = 'jar' | 'war';
export type LinterType = 'checkstyle' | 'pmd' | 'ktlint';
export type ProjectType = 'application' | 'library';
export type MvnBuildCommandType = 'compile' | 'package' | 'install';
export type ImageType = 'jvm' | 'legacy-jar' | 'native' | 'native-micro';
export type GetVersionFunction = (dir: string) => string;

export type MavenPluginType =
  | '@jnxplus/nx-maven'
  | '@jnxplus/nx-boot-maven'
  | '@jnxplus/nx-quarkus-maven'
  | '@jnxplus/nx-micronaut-maven';

export type GradlePluginType =
  | '@jnxplus/nx-gradle'
  | '@jnxplus/nx-boot-gradle'
  | '@jnxplus/nx-quarkus-gradle'
  | '@jnxplus/nx-micronaut-gradle';
