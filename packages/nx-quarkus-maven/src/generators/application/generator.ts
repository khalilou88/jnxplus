import { applicationGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';
import { NxMavenAppGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-quarkus-maven',
    tree,
    options
  );
}
