import { libraryGenerator } from '@jnxplus/gradle';
import { Tree } from '@nx/devkit';
import { NxMicronautGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxMicronautGradleLibGeneratorSchema
) {
  await libraryGenerator(
    __dirname,
    '@jnxplus/nx-micronaut-gradle',
    tree,
    options
  );
}
