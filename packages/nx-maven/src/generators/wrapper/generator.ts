import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  Tree,
} from '@nx/devkit';
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
    joinPathFragments(normalizedOptions.mavenRootDirectory, 'mvnw'),
    '755',
  );
  tree.changePermissions(
    joinPathFragments(normalizedOptions.mavenRootDirectory, 'mvnw.cmd'),
    '755',
  );
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  let mavenIgnore = '';
  const mavenIgnore1 = '\n\n# Maven Wrapper';
  const mavenIgnore2 = '\n.mvn/';
  const mavenIgnore3 = '\nmvnw';
  const mavenIgnore4 = '\nmvnw.cmd';

  mavenIgnore = mavenIgnore1 + mavenIgnore2 + mavenIgnore3 + mavenIgnore4;

  const newContents = contents.concat(mavenIgnore);
  tree.write(filePath, newContents);
}
