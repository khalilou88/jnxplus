import { QuarkusBuildImageExecutorSchema } from '@jnxplus/common';

export interface BuildImageExecutorSchema
  extends QuarkusBuildImageExecutorSchema {
  framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  args: string;
}
