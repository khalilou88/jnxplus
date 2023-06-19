import { libraryGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxBootGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
) {
  await libraryGenerator(__dirname, '@jnxplus/nx-boot-gradle', tree, options);
}
