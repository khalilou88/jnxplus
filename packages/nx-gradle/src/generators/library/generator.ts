import { libraryGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleLibGeneratorSchema,
) {
  await libraryGenerator(__dirname, '@jnxplus/nx-gradle', tree, options);
}
