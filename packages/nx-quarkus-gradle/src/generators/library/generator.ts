import { libraryGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxQuarkusGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxQuarkusGradleLibGeneratorSchema
) {
  await libraryGenerator(
    __dirname,
    '@jnxplus/nx-quarkus-gradle',
    tree,
    options
  );
}
