import {
  NxMavenAppGeneratorSchema,
  applicationGenerator,
} from '@jnxplus/maven';
import { Tree } from '@nx/devkit';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-micronaut-maven',
    tree,
    options
  );
}
