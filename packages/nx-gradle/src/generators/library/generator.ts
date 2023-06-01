import { libraryGenerator } from '@jnxplus/internal-boot-gradle';
import { Tree } from '@nx/devkit';
import { NxGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleLibGeneratorSchema
) {
  await libraryGenerator(tree, options);
}
