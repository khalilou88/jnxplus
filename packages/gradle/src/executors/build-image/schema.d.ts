import { QuarkusBuildImageExecutorSchema } from '@jnxplus/common';
import { MicronautBuildImageExecutorSchema } from './micronaut/schema';

export type BuildImageExecutorSchema = MicronautBuildImageExecutorSchema &
  QuarkusBuildImageExecutorSchema & {
    framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  };
