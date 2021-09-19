import {
  formatFiles,
  generateFiles,
  offsetFromRoot,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import * as path from 'path';
import { NxBootGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleGeneratorSchema {
  kotlinExtension: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleGeneratorSchema
): NormalizedSchema {
  const kotlinExtension = options.dsl === 'kotlin' ? '.kts' : '';

  return {
    ...options,
    kotlinExtension,
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
    path.join(__dirname, 'files', 'gradle'),
    '',
    templateOptions
  );
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'linters'),
    'tools/linters',
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree);
  updateGitIgnore(tree);
  updatePrettierIgnore(tree);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8');

  const gradleIgnore = '\n# Gradle\n.gradle\nbuild';

  const newContents = contents.concat(gradleIgnore);
  tree.write(filePath, newContents);
}

function updateNxJson(tree: Tree) {
  updateJson(tree, 'nx.json', (pkgJson) => {
    // if scripts is undefined, set it to an empty array
    pkgJson.plugins = pkgJson.plugins ?? [];
    // add @jnxplus/nx-boot-gradle plugin
    pkgJson.plugins.push('@jnxplus/nx-boot-gradle');
    // return modified JSON object
    return pkgJson;
  });
}

function updatePrettierIgnore(tree: Tree) {
  const filePath = `.prettierignore`;
  const contents = tree.read(filePath, 'utf-8');

  const prettierIgnore = '\n# Gradle build\nbuild';

  const newContents = contents.concat(prettierIgnore);
  tree.write(filePath, newContents);
}
