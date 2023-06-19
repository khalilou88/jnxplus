import { applicationGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxMicronautGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxMicronautGradleAppGeneratorSchema
) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-micronaut-gradle',
    tree,
    options
  );
}
