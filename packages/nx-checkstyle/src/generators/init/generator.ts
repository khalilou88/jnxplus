import { Tree, formatFiles, generateFiles, offsetFromRoot } from '@nx/devkit';
import * as path from 'path';
import { NxInitGeneratorSchema } from './schema';

function addFiles(tree: Tree, options: NxInitGeneratorSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'checkstyle'),
    'tools/checkstyle',
    templateOptions,
  );
}

export default async function (tree: Tree, options: NxInitGeneratorSchema) {
  addFiles(tree, options);
  await formatFiles(tree);
}
