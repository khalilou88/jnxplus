import { applicationGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxBootGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxBootGradleAppGeneratorSchema
) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-boot-gradle',
    tree,
    options
  );
}
