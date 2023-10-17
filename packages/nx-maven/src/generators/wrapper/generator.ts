import { formatFiles, generateFiles, offsetFromRoot, Tree } from '@nx/devkit';
import * as path from 'path';
import { NxMavenWrapperGeneratorSchema } from './schema';
import { getMavenRootDirectory } from '../../utils';

interface NormalizedSchema extends NxMavenWrapperGeneratorSchema {
  dot: string;
  mavenRootDirectory: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenWrapperGeneratorSchema,
): NormalizedSchema {
  const dot = '.';

  const mavenRootDirectory = getMavenRootDirectory();

  return {
    ...options,
    dot,
    mavenRootDirectory,
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
    path.join(__dirname, '..', 'init', 'files', 'maven', 'wrapper'),
    options.mavenRootDirectory,
    templateOptions,
  );
}

export default async function (
  tree: Tree,
  options: NxMavenWrapperGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  if (!options.skipGitignore) {
    updateGitIgnore(tree);
  }
  tree.changePermissions(
    path.join(normalizedOptions.mavenRootDirectory, 'mvnw'),
    '755',
  );
  tree.changePermissions(
    path.join(normalizedOptions.mavenRootDirectory, 'mvnw.cmd'),
    '755',
  );
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const mavenIgnore = '\n# Maven wrapper\n.mvn/\nmvnw\nmvnw.cmd';

  const newContents = contents.concat(mavenIgnore);
  tree.write(filePath, newContents);
}
