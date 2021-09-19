import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { LinterType } from '../../utils/types';
import { NxBootGradleAppGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleAppGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  linter?: LinterType;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleAppGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${projectName}`
    : projectName;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const appClassName = `${names(options.name).className}Application`;
  const packageName = `${options.groupId}.${names(
    options.name
  ).className.toLocaleLowerCase()}`;
  const packageDirectory = `${options.groupId.replace(
    new RegExp(/\./, 'g'),
    '/'
  )}/${names(options.name).className.toLocaleLowerCase()}`;

  const linter = options.language === 'java' ? 'checkstyle' : 'ktlint';

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    appClassName,
    packageName,
    packageDirectory,
    linter,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', options.language),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleAppGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@jnxplus/nx-boot-gradle:build',
        options: {
          packaging: `${normalizedOptions.packaging}`,
        },
      },
      serve: {
        executor: '@jnxplus/nx-boot-gradle:serve',
      },
      lint: {
        executor: '@jnxplus/nx-boot-gradle:lint',
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: '@jnxplus/nx-boot-gradle:test',
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  await formatFiles(tree);
}

function addProjectToGradleSetting(tree: Tree, options: NormalizedSchema) {
  const filePath = `settings.gradle`;
  const ktsFilePath = `settings.gradle.kts`;
  const regex = /.*rootProject\.name.*/;
  const gradleProjectPath = options.projectRoot.replace(
    new RegExp('/', 'g'),
    ':'
  );

  if (tree.exists(filePath)) {
    const settingsContent = tree.read(filePath, 'utf-8');

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude('${gradleProjectPath}')`
    );
    tree.write(filePath, newSettingsContent);
  }

  if (tree.exists(ktsFilePath)) {
    const settingsContent = tree.read(ktsFilePath, 'utf-8');

    const newSettingsContent = settingsContent.replace(
      regex,
      `$&\ninclude("${gradleProjectPath}")`
    );
    tree.write(ktsFilePath, newSettingsContent);
  }
}
