import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  Tree,
  workspaceRoot,
} from '@nrwl/devkit';
import * as path from 'path';
import { getQuarkusPlatformVersion, normalizeName } from '../../utils/command';
import { LinterType } from '../../utils/types';
import { NxQuarkusGradleAppGeneratorSchema } from './schema';
import { quarkusPlatformVersion } from '../../utils/versions';
import * as fs from 'fs';

interface NormalizedSchema extends NxQuarkusGradleAppGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  linter?: LinterType;
  quarkusVersion;
}

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusGradleAppGeneratorSchema
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;

  let projectName: string;
  if (options.simpleName) {
    projectName = simpleProjectName;
  } else {
    projectName = options.directory
      ? `${normalizeName(
          names(options.directory).fileName
        )}-${simpleProjectName}`
      : simpleProjectName;
  }

  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}`
    : simpleProjectName;
  const projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const appClassName = `${names(projectName).className}Application`;

  let packageName: string;
  if (options.simplePackageName) {
    packageName = `${options.groupId}.${names(
      simpleProjectName
    ).className.toLocaleLowerCase()}`.replace(new RegExp(/-/, 'g'), '');
  } else {
    packageName = `${options.groupId}.${
      options.directory
        ? `${names(options.directory).fileName.replace(
            new RegExp(/\//, 'g'),
            '.'
          )}.${names(simpleProjectName).className.toLocaleLowerCase()}`
        : names(simpleProjectName).className.toLocaleLowerCase()
    }`.replace(new RegExp(/-/, 'g'), '');
  }

  const packageDirectory = packageName.replace(new RegExp(/\./, 'g'), '/');

  const linter = options.language === 'java' ? 'checkstyle' : 'ktlint';

  const gradlePropertiesPath = path.join(workspaceRoot, 'gradle.properties');
  const gradlePropertiesContent = fs.readFileSync(
    gradlePropertiesPath,
    'utf-8'
  );
  let quarkusVersion = getQuarkusPlatformVersion(gradlePropertiesContent);
  if (quarkusVersion === undefined) {
    quarkusVersion = quarkusPlatformVersion;
  }

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
    quarkusVersion,
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

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/GreetingResource.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/GreetingResourceTest.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/native-test/${options.language}/${options.packageDirectory}/GreetingResourceIT.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/resources/META-INF/resources/index.html`
      )
    );
  } else {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/.gitkeep`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/.gitkeep`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/native-test/${options.language}/.gitkeep`
      )
    );
  }
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
        'integration-test': {
          executor: '@jnxplus/nx-quarkus-gradle:integration-test',
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
        'integration-test': {
          executor: '@jnxplus/nx-quarkus-gradle:integration-test',
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
