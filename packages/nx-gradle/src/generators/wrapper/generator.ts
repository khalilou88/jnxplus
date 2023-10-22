import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { NxGradleWrapperGeneratorSchema } from './schema';
import { getGradleRootDirectory } from '../../utils';

interface NormalizedSchema extends NxGradleWrapperGeneratorSchema {
  gradleRootDirectory: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleWrapperGeneratorSchema,
): NormalizedSchema {
  const gradleRootDirectory = getGradleRootDirectory();

  return {
    ...options,
    gradleRootDirectory,
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
    options.gradleRootDirectory,
    templateOptions,
  );
}

export default async function (
  tree: Tree,
  options: NxGradleWrapperGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  if (!options.skipGitignore) {
    updateGitIgnore(tree);
  }
  tree.changePermissions(
    joinPathFragments(normalizedOptions.gradleRootDirectory, 'gradlew'),
    '755',
  );
  tree.changePermissions(
    joinPathFragments(normalizedOptions.gradleRootDirectory, 'gradlew.bat'),
    '755',
  );
  await formatFiles(tree);
}

//TODO update gitignore with all files
export function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const gradleIgnore = '\n# Gradle\n.gradle';

  const newContents = contents.concat(gradleIgnore);
  tree.write(filePath, newContents);
}
