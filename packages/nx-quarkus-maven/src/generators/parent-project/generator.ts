import { parentProjectGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';
import { NxQuarkusMavenParentProjectGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxQuarkusMavenParentProjectGeneratorSchema
) {
  await parentProjectGenerator(
    __dirname,
    '@jnxplus/nx-quarkus-maven',
    tree,
    options
  );
}
