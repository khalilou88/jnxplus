import {
  formatFiles,
  generateFiles,
  offsetFromRoot,
  Tree,
  updateJson,
} from '@nrwl/devkit';
import * as path from 'path';
import { kotlinVersion } from '../../utils/versions';
import { NxBootMavenGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootMavenGeneratorSchema {
  dot: string;
  kotlinVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootMavenGeneratorSchema
): NormalizedSchema {
  const dot = '.';

  return {
    ...options,
    dot,
    kotlinVersion,
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
    path.join(__dirname, 'files', 'maven'),
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
  options: NxBootMavenGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree);
  updateGitIgnore(tree);
  updatePrettierIgnore(tree);
  tree.changePermissions('mvnw', '755');
  tree.changePermissions('mvnw.cmd', '755');
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8');

  const mavenIgnore =
    '\n# Maven\ntarget/\n!.mvn/wrapper/maven-wrapper.jar\n!**/src/main/**/target/\n!**/src/test/**/target/';

  const newContents = contents.concat(mavenIgnore);
  tree.write(filePath, newContents);
}

function updateNxJson(tree: Tree) {
  updateJson(tree, 'nx.json', (nxJson) => {
    // if scripts is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add @jnxplus/nx-boot-maven plugin
    nxJson.plugins.push('@jnxplus/nx-boot-maven');
    // return modified JSON object
    return nxJson;
  });
}

function updatePrettierIgnore(tree: Tree) {
  const filePath = `.prettierignore`;
  const contents = tree.read(filePath, 'utf-8');

  const prettierIgnore = '\n# Maven target\ntarget/';

  const newContents = contents.concat(prettierIgnore);
  tree.write(filePath, newContents);
}
