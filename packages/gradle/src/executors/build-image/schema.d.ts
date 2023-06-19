export type BuildImageExecutorSchema = BuildImage2ExecutorSchema &
  QuarkusBuildImageExecutorSchema & {
    framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  };
