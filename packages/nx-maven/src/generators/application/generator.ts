import { Tree } from '@nx/devkit';
import { applicationGenerator } from '@jnxplus/maven';
import { NxMavenAppGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
}
