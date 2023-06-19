import { parentProjectGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';
import { NxMavenParentProjectGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema
) {
  await parentProjectGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
}
