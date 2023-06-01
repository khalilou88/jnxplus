import { Tree } from '@nx/devkit';
import { NxGradleAppGeneratorSchema } from './schema';
import { applicationGenerator } from '@jnxplus/internal-boot-gradle';

export default async function (
  tree: Tree,
  options: NxGradleAppGeneratorSchema
) {
  await applicationGenerator(tree, options);
}
