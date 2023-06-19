import { libraryGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';
import { NxMavenLibGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenLibGeneratorSchema) {
  await libraryGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
}
