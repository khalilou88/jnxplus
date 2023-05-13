import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nx/devkit';
import * as path from 'path';
import { NxQuarkusGradleMigrateGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusGradleMigrateGeneratorSchema {} // eslint-disable-line

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusGradleMigrateGeneratorSchema
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
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxQuarkusGradleMigrateGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}
