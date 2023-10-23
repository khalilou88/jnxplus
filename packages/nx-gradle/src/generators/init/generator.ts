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
import {
  addOrUpdateGitattributes,
  addOrUpdatePrettierIgnore,
} from '../../utils/generators';
import { NxGradleGeneratorSchema } from './schema';

interface NormalizedSchema extends NxGradleGeneratorSchema {
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
  options: NxGradleGeneratorSchema,
): NormalizedSchema {
  const kotlinExtension =
    options.dsl === 'kotlin' || options.preset === 'kotlin-multiplatform'
      ? '.kts'
      : '';

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
}

export default async function (tree: Tree, options: NxGradleGeneratorSchema) {
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
  const filePath = `.gitignore`;
  const contents = tree.read(filePath, 'utf-8') || '';

  let gradleIgnore = '';
  const gradleIgnore1 = '\n\n# Gradle';
  const gradleIgnore2 = '\n.gradle';
  const gradleIgnore3 = '\nbuild/';
  const gradleIgnore4 = '\n!**/src/main/**/build/';
  const gradleIgnore5 = '\n!**/src/test/**/build/';

  gradleIgnore =
    gradleIgnore1 +
    gradleIgnore2 +
    gradleIgnore3 +
    gradleIgnore4 +
    gradleIgnore5;

  if (!options.skipWrapper) {
    const gradleWrapperIgnore = '\n!gradle/wrapper/gradle-wrapper.jar';
    gradleIgnore += gradleWrapperIgnore;
  }

  const newContents = contents.concat(gradleIgnore);
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
  const prettierRcPath = `.prettierrc`;
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
