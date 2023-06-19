import { applicationGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxQuarkusGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxQuarkusGradleAppGeneratorSchema
) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-quarkus-gradle',
    tree,
    options
  );
}
