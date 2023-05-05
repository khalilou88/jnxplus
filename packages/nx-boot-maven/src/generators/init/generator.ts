import {
  Tree,
  formatFiles,
  generateFiles,
  offsetFromRoot,
  updateJson,
  writeJson,
} from '@nx/devkit';
import * as path from 'path';
import {
  checkstyleVersion,
  kotlinVersion,
  ktlintVersion,
  springBootVersion,
} from '@jnxplus/common';
import { NxBootMavenGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootMavenGeneratorSchema {
  dot: string;
  kotlinVersion: string;
  springBootStarterParentVersion: string;
  checkstyleVersion: string;
  ktlintVersion: string;
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
    springBootStarterParentVersion: springBootVersion,
    checkstyleVersion,
    ktlintVersion,
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
    path.join(__dirname, 'files', 'maven', 'wrapper'),
    '',
    templateOptions
  );
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'maven', 'config'),
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
  addOrUpdatePrettierRc(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);
  tree.changePermissions('mvnw', '755');
  tree.changePermissions('mvnw.cmd', '755');
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const mavenIgnore =
    '\n# Maven\ntarget/\n!.mvn/wrapper/maven-wrapper.jar\n!**/src/main/**/target/\n!**/src/test/**/target/';

  const newContents = contents.concat(mavenIgnore);
  tree.write(filePath, newContents);
}

function updateNxJson(tree: Tree) {
  updateJson(tree, 'nx.json', (nxJson) => {
    // if plugins is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add @jnxplus/nx-boot-maven plugin
    nxJson.plugins.push('@jnxplus/nx-boot-maven');
    // return modified JSON object
    return nxJson;
  });
}

function addOrUpdatePrettierRc(tree: Tree) {
  const prettierRcPath = `.prettierrc`;
  if (tree.exists(prettierRcPath)) {
    updateJson(tree, prettierRcPath, (prettierRcJson) => {
      prettierRcJson.xmlWhitespaceSensitivity = 'ignore';
      // return modified JSON object
      return prettierRcJson;
    });
  } else {
    writeJson(tree, prettierRcPath, {
      xmlWhitespaceSensitivity: 'ignore',
    });
  }
}

function addOrUpdatePrettierIgnore(tree: Tree) {
  const prettierIgnorePath = `.prettierignore`;
  const mavenPrettierIgnore = '# Maven target\ntarget/';
  if (tree.exists(prettierIgnorePath)) {
    const prettierIgnoreOldContent =
      tree.read(prettierIgnorePath, 'utf-8') || '';
    const prettierIgnoreContent = prettierIgnoreOldContent.concat(
      '\n',
      mavenPrettierIgnore
    );
    tree.write(prettierIgnorePath, prettierIgnoreContent);
  } else {
    tree.write(prettierIgnorePath, mavenPrettierIgnore);
  }
}

function addOrUpdateGitattributes(tree: Tree) {
  const gitattributesPath = `.gitattributes`;
  const mavenWrapperGitattributes =
    '# OS specific line endings for the Maven wrapper script\nmvnw text eol=lf\nmvnw.cmd text eol=crlf';
  if (tree.exists(gitattributesPath)) {
    const gitattributesOldContent = tree.read(gitattributesPath, 'utf-8') || '';
    const gitattributesContent = gitattributesOldContent.concat(
      '\n',
      mavenWrapperGitattributes
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, mavenWrapperGitattributes);
  }
}
