import {
  formatFiles,
  generateFiles,
  offsetFromRoot,
  Tree,
  updateJson,
} from '@nx/devkit';
import * as path from 'path';
import {
  quarkusPlatformVersion,
  quarkusKotlinVersion,
  checkstyleVersion,
  ktlintVersion,
} from '@jnxplus/common';
import { NxQuarkusGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusGradleGeneratorSchema {
  quarkusPlatformVersion: string;
  kotlinJvmVersion: string;
  kotlinPluginAllopenVersion: string;
  kotlinExtension: string;
  checkstyleVersion: string;
  ktlintVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusGradleGeneratorSchema
): NormalizedSchema {
  const kotlinExtension = options.dsl === 'kotlin' ? '.kts' : '';

  return {
    ...options,
    kotlinExtension,
    quarkusPlatformVersion,
    kotlinJvmVersion: quarkusKotlinVersion,
    kotlinPluginAllopenVersion: quarkusKotlinVersion,
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
    path.join(__dirname, 'files', 'gradle', 'wrapper'),
    '',
    templateOptions
  );
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'gradle', 'config'),
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
  options: NxQuarkusGradleGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addFiles(tree, normalizedOptions);
  updateNxJson(tree);
  updateGitIgnore(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);
  tree.changePermissions('gradlew', '755');
  tree.changePermissions('gradlew.bat', '755');
  await formatFiles(tree);
}

function updateGitIgnore(tree: Tree) {
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  const gradleIgnore = '\n# Gradle\n.gradle\nbuild';

  const newContents = contents.concat(gradleIgnore);
  tree.write(filePath, newContents);
}

function updateNxJson(tree: Tree) {
  updateJson(tree, 'nx.json', (nxJson) => {
    // if plugins is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add @jnxplus/nx-quarkus-gradle plugin
    nxJson.plugins.push('@jnxplus/nx-quarkus-gradle');
    // return modified JSON object
    return nxJson;
  });
}

function addOrUpdatePrettierIgnore(tree: Tree) {
  const prettierIgnorePath = `.prettierignore`;
  const gradlePrettierIgnore = '# Gradle build\nbuild';
  if (tree.exists(prettierIgnorePath)) {
    const prettierIgnoreOldContent =
      tree.read(prettierIgnorePath, 'utf-8') || '';
    const prettierIgnoreContent = prettierIgnoreOldContent.concat(
      '\n',
      gradlePrettierIgnore
    );
    tree.write(prettierIgnorePath, prettierIgnoreContent);
  } else {
    tree.write(prettierIgnorePath, gradlePrettierIgnore);
  }
}

function addOrUpdateGitattributes(tree: Tree) {
  const gitattributesPath = `.gitattributes`;
  const gradleWrapperGitattributes = `#\n# https://help.github.com/articles/dealing-with-line-endings/\n#\n# Linux start script should use lf\n/gradlew        text eol=lf\n# These are Windows script files and should use crlf\n*.bat           text eol=crlf`;
  if (tree.exists(gitattributesPath)) {
    const gitattributesOldContent = tree.read(gitattributesPath, 'utf-8') || '';
    const gitattributesContent = gitattributesOldContent.concat(
      '\n',
      gradleWrapperGitattributes
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, gradleWrapperGitattributes);
  }
}
