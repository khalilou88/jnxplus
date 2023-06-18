import { Tree } from '@nx/devkit';

import {
  NxMavenAppGeneratorSchema,
  applicationGenerator,
} from '@jnxplus/maven';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(
    __dirname,
    '@jnxplus/nx-boot-maven',
    tree,
    options
  );
}
