import { PackagingType } from '@jnxplus/common';

export interface BuildExecutorSchema {
  packaging?: PackagingType;
  framework?: 'spring-boot' | 'quarkus' | 'micronaut';
  args: string;
}
