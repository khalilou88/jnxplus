import { Tree } from '@nx/devkit';
import { libraryGenerator } from '@jnxplus/maven';
import { NxMavenLibGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenLibGeneratorSchema) {
  await libraryGenerator(
    __dirname,
    '@jnxplus/nx-micronaut-maven',
    tree,
    options
  );
}
