import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nx/devkit';
import * as path from 'path';
import { NxBootGradleMigrateGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleMigrateGeneratorSchema {} // eslint-disable-line

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleMigrateGeneratorSchema,
): NormalizedSchema {
  return {
    ...options,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, '..', 'init', 'files', 'gradle', 'wrapper'),
    '',
    templateOptions,
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleMigrateGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
