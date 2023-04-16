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
import { normalizeName } from '../../utils/command';
import { LinterType } from '../../utils/types';
import { NxQuarkusGradleAppGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusGradleAppGeneratorSchema {
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
  options: NxQuarkusGradleAppGeneratorSchema
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;
  const projectName = options.directory
    ? `${normalizeName(names(options.directory).fileName)}-${simpleProjectName}`
    : simpleProjectName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}`
    : simpleProjectName;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const appClassName = `${names(projectName).className}Application`;

  const packageName2 = `${options.groupId}.${
    options.packageNameType === 'long' && options.directory
      ? `${names(options.directory).fileName.replace(
          new RegExp(/\//, 'g'),
          '.'
        )}.${names(simpleProjectName).className.toLocaleLowerCase()}`
      : names(simpleProjectName).className.toLocaleLowerCase()
  }`;

  //remove dash from packageName
  const packageName = packageName2.replace(new RegExp(/-/, 'g'), '');

  const packageDirectory = packageName.replace(new RegExp(/\./, 'g'), '/');

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
  options: NxQuarkusGradleAppGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.language === 'java') {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'application',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-quarkus-gradle:build',
          options: {
            packaging: `${normalizedOptions.packaging}`,
          },
        },
        'build-image': {
          executor: '@jnxplus/nx-quarkus-gradle:build-image',
        },
        serve: {
          executor: '@jnxplus/nx-quarkus-gradle:serve',
        },
        lint: {
          executor: '@jnxplus/nx-quarkus-gradle:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-quarkus-gradle:test',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  } else {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'application',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-quarkus-gradle:build',
          options: {
            packaging: `${normalizedOptions.packaging}`,
          },
        },
        'build-image': {
          executor: '@jnxplus/nx-quarkus-gradle:build-image',
        },
        serve: {
          executor: '@jnxplus/nx-quarkus-gradle:serve',
        },
        lint: {
          executor: '@jnxplus/nx-quarkus-gradle:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-quarkus-gradle:test',
        },
        ktformat: {
          executor: '@jnxplus/nx-quarkus-gradle:ktformat',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  }

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
