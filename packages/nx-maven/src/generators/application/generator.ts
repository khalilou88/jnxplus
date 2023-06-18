import { Tree } from '@nx/devkit';
import {
  NxMavenAppGeneratorSchema,
  applicationGenerator,
} from '@jnxplus/maven';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(tree, options);
}
