import { QuarkusBuildImageExecutorSchema } from '@jnxplus/common';

export type BuildImageExecutorSchema = QuarkusBuildImageExecutorSchema & {
  framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  args: string;
};
