import { parentProjectGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';
import { NxBootMavenParentProjectGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxBootMavenParentProjectGeneratorSchema
) {
  await parentProjectGenerator(
    __dirname,
    '@jnxplus/nx-boot-maven',
    tree,
    options
  );
}
