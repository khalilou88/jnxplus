import { Tree, formatFiles, generateFiles, offsetFromRoot } from '@nx/devkit';
import * as path from 'path';
import { NxGradleGeneratorSchema } from './schema';

function addFiles(tree: Tree, options: NxGradleGeneratorSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'linters'),
    'tools/linters',
    templateOptions,
  );
}

export default async function (tree: Tree, options: NxGradleGeneratorSchema) {
  addFiles(tree, options);
  await formatFiles(tree);
}
