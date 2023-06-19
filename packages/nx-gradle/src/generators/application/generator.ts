import { applicationGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleAppGeneratorSchema
) {
  await applicationGenerator(__dirname, '@jnxplus/nx-gradle', tree, options);
}
