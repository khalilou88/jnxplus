export interface ServeExecutorSchema {
  framework: 'spring-boot' | 'quarkus' | 'micronaut';
  args: string;
}
