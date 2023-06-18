import { NxMavenLibGeneratorSchema, libraryGenerator } from '@jnxplus/maven';
import { Tree } from '@nx/devkit';

export default async function (tree: Tree, options: NxMavenLibGeneratorSchema) {
  await libraryGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
}
