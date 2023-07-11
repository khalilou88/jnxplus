import {
  jnxplusGradlePluginVersion,
  kotlinVersion,
  kspVersion,
  micronautVersion,
  prettierPluginJavaVersion,
  prettierVersion,
  quarkusVersion,
  shadowVersion,
  springBootVersion,
  springDependencyManagementVersion,
} from '@jnxplus/common';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  installPackagesTask,
  joinPathFragments,
  offsetFromRoot,
  updateJson,
  writeJson,
} from '@nx/devkit';
import * as path from 'path';
import { NxGradleInitGeneratorSchema } from './schema';

interface NormalizedSchema extends NxGradleInitGeneratorSchema {
  kotlinExtension: string;
  springBootVersion: string;
  springDependencyManagementVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  kspVersion: string;
  shadowVersion: string;
  kotlinVersion: string;
  jnxplusGradlePluginVersion: string;
  generateRepositories: boolean;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleInitGeneratorSchema,
): NormalizedSchema {
  const kotlinExtension =
    options.dsl === 'kotlin' || options.preset === 'kmp' ? '.kts' : '';

  const generateRepositories = process.env['NODE_ENV'] === 'test';

  return {
    ...options,
    kotlinExtension,
    springBootVersion,
    springDependencyManagementVersion,
    quarkusVersion,
    micronautVersion,
    kspVersion,
    shadowVersion,
    kotlinVersion,
    jnxplusGradlePluginVersion,
    generateRepositories,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };

  if (!options.skipWrapper) {
    generateFiles(
      tree,
      path.join(__dirname, 'files', 'gradle', 'wrapper'),
      options.gradleRootDirectory,
      templateOptions,
    );
  }

  generateFiles(
    tree,
    path.join(__dirname, 'files', 'gradle', 'config', options.preset),
    options.gradleRootDirectory,
    templateOptions,
  );

    if (options.versionManagement === 'version-catalog') {
      generateFiles(
        tree,
        path.join(__dirname, 'files', 'gradle', 'catalog', options.preset),
        'gradle',
        templateOptions
      );
    }
}

export default initGenerator;

export async function initGenerator(
  tree: Tree,
  options: NxGradleInitGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.gradleRootDirectory) {
    const projectConfiguration: ProjectConfiguration = {
      root: normalizedOptions.gradleRootDirectory,
      targets: {},
    };

    addProjectConfiguration(
      tree,
      normalizedOptions.rootProjectName,
      projectConfiguration,
    );
  }

  addFiles(tree, normalizedOptions);
  updateNxJson(tree, normalizedOptions);
  updateGitIgnore(tree, normalizedOptions);
  addPrettierToPackageJson(tree);
  addOrUpdatePrettierRc(tree);
  addOrUpdatePrettierIgnore(tree);
  addOrUpdateGitattributes(tree);

  if (!options.skipWrapper) {
    tree.changePermissions(
      joinPathFragments(options.gradleRootDirectory, 'gradlew'),
      '755',
    );
    tree.changePermissions(
      joinPathFragments(options.gradleRootDirectory, 'gradlew.bat'),
      '755',
    );
  }
  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);
  };
}

function updateNxJson(tree: Tree, options: NormalizedSchema) {
  const plugin = {
    plugin: '@jnxplus/nx-gradle',
    options: {
      gradleRootDirectory: options.gradleRootDirectory,
    },
  };

  updateJson(tree, 'nx.json', (nxJson) => {
    // if plugins is undefined, set it to an empty array
    nxJson.plugins = nxJson.plugins ?? [];
    // add plugin
    nxJson.plugins.push(plugin);
    // return modified JSON object
    return nxJson;
  });
}

function updateGitIgnore(tree: Tree, options: NormalizedSchema) {
  const filePath = '.gitignore';
  const contents = tree.read(filePath, 'utf-8') || '';

  const gradleIgnores = [
    '\n',
    '\n# Gradle',
    '\n.gradle',
    '\nbuild/',
    '\n!**/src/main/**/build/',
    '\n!**/src/test/**/build/',
  ];

  if (!options.skipWrapper) {
    gradleIgnores.push('\n!gradle/wrapper/gradle-wrapper.jar');
  }

  const newContents = contents.concat(gradleIgnores.join(''));
  tree.write(filePath, newContents);
}

function addPrettierToPackageJson(tree: Tree) {
  updateJson(tree, 'package.json', (packageJson) => {
    packageJson.devDependencies = packageJson.devDependencies ?? {};

    if (!packageJson.devDependencies['prettier']) {
      packageJson.devDependencies['prettier'] = prettierVersion;
    }

    if (!packageJson.devDependencies['prettier-plugin-java']) {
      packageJson.devDependencies['prettier-plugin-java'] =
        prettierPluginJavaVersion;
    }
    return packageJson;
  });
}

function addOrUpdatePrettierRc(tree: Tree) {
  const prettierRcPath = '.prettierrc';
  if (tree.exists(prettierRcPath)) {
    updateJson(tree, prettierRcPath, (prettierRcJson) => {
      prettierRcJson.plugins = prettierRcJson.plugins ?? [];
      if (!prettierRcJson.plugins.includes('prettier-plugin-java')) {
        prettierRcJson.plugins.push('prettier-plugin-java');
      }
      // return modified JSON object
      return prettierRcJson;
    });
  } else {
    writeJson(tree, prettierRcPath, {
      plugins: ['prettier-plugin-java'],
    });
  }
}

function addOrUpdatePrettierIgnore(tree: Tree) {
  const prettierIgnorePath = '.prettierignore';
  const gradlePrettierIgnores = ['# Gradle build', '\nbuild/'];
  if (tree.exists(prettierIgnorePath)) {
    const prettierIgnoreOldContent =
      tree.read(prettierIgnorePath, 'utf-8') || '';

    gradlePrettierIgnores.unshift('\n\n');
    const prettierIgnoreContent = prettierIgnoreOldContent.concat(
      gradlePrettierIgnores.join(''),
    );
    tree.write(prettierIgnorePath, prettierIgnoreContent);
  } else {
    tree.write(prettierIgnorePath, gradlePrettierIgnores.join(''));
  }
}

function addOrUpdateGitattributes(tree: Tree) {
  const gitattributesPath = '.gitattributes';
  const attributes = [
    '#',
    '\n# https://help.github.com/articles/dealing-with-line-endings/',
    '\n#',
    '\n# Linux start script should use lf',
    '\ngradlew text eol=lf',
    '\n# Windows script files should use crlf',
    '\n*.bat text eol=crlf',
  ];

  if (tree.exists(gitattributesPath)) {
    const gitattributesOldContent = tree.read(gitattributesPath, 'utf-8') || '';
    attributes.unshift('\n\n');

    const gitattributesContent = gitattributesOldContent.concat(
      attributes.join(''),
    );
    tree.write(gitattributesPath, gitattributesContent);
  } else {
    tree.write(gitattributesPath, attributes.join(''));
  }
}
