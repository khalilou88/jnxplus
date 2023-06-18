import { Tree } from '@nx/devkit';
import { NxMavenLibGeneratorSchema, libraryGenerator } from '@jnxplus/maven';

export default async function (tree: Tree, options: NxMavenLibGeneratorSchema) {
  await libraryGenerator(
    __dirname,
    '@jnxplus/nx-micronaut-maven',
    tree,
    options
  );
}
