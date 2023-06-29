import { DSLType, LinterType, normalizeName } from '@jnxplus/common';
import { addProjectToGradleSetting, getDsl } from '@jnxplus/gradle';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import { NxGradleAppGeneratorSchema } from './schema';
import * as path from 'path';

interface NormalizedSchema extends NxGradleAppGeneratorSchema {
  androidAppName: string;
  iosAppName: string;
  desktopAppName: string;
  sharedLibName: string;

  androidAppRoot: string;
  iosAppRoot: string;
  desktopAppRoot: string;
  sharedLibRoot: string;

  androidAppDirectory: string;
  iosAppDirectory: string;
  desktopAppDirectory: string;
  sharedLibDirectory: string;

  //TODO
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  linter?: LinterType;
  isCustomPort: boolean;
  dsl: DSLType;
  kotlinExtension: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleAppGeneratorSchema
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;

  let androidAppName: string;
  let iosAppName: string;
  let desktopAppName: string;
  let sharedLibName: string;

  if (options.simpleName || !options.directory) {
    androidAppName = `${simpleProjectName}-android`;
    iosAppName = `${simpleProjectName}-ios`;
    desktopAppName = `${simpleProjectName}-desktop`;
    sharedLibName = `${simpleProjectName}-shared`;
  } else {
    androidAppName = `${normalizeName(
      names(options.directory).fileName
    )}-${simpleProjectName}-android`;
    iosAppName = `${normalizeName(
      names(options.directory).fileName
    )}-${simpleProjectName}-ios`;
    desktopAppName = `${normalizeName(
      names(options.directory).fileName
    )}-${simpleProjectName}-desktop`;
    sharedLibName = `${normalizeName(
      names(options.directory).fileName
    )}-${simpleProjectName}-shared`;
  }

  const androidAppDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}-android`
    : `${simpleProjectName}-android`;
  const androidAppRoot = `${
    getWorkspaceLayout(tree).appsDir
  }/${androidAppDirectory}`;

  const iosAppDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}-ios`
    : `${simpleProjectName}-ios`;
  const iosAppRoot = `${getWorkspaceLayout(tree).appsDir}/${iosAppDirectory}`;

  const desktopAppDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}-desktop`
    : `${simpleProjectName}-desktop`;
  const desktopAppRoot = `${
    getWorkspaceLayout(tree).appsDir
  }/${desktopAppDirectory}`;

  const sharedLibDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}-shared`
    : `${simpleProjectName}-shared`;
  const sharedLibRoot = `${
    getWorkspaceLayout(tree).libsDir
  }/${sharedLibDirectory}`;

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const appClassName = `${names(androidAppName).className}Application`;

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

  const isCustomPort = !!options.port && +options.port !== 8080;

  const dsl = getDsl(tree);
  const kotlinExtension = dsl === 'kotlin' ? '.kts' : '';

  return {
    ...options,
    androidAppName,
    iosAppName,
    desktopAppName,
    sharedLibName,
    androidAppRoot,
    iosAppRoot,
    desktopAppRoot,
    sharedLibRoot,
    androidAppDirectory,
    iosAppDirectory,
    desktopAppDirectory,
    sharedLibDirectory,
    parsedTags,
    appClassName,
    packageName,
    packageDirectory,
    linter,
    isCustomPort,
    dsl,
    kotlinExtension,
  };
}

function addAndroidFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'android-app'),
    options.androidAppRoot,
    templateOptions
  );
}

function addIosFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'ios-app'),
    options.iosAppRoot,
    templateOptions
  );
}

function addDesktopFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'desktop-app'),
    options.desktopAppRoot,
    templateOptions
  );
}

function addSharedFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    offsetFromRoot: offsetFromRoot(tree.root),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'shared-lib'),
    options.sharedLibRoot,
    templateOptions
  );
}

function generateAndroidApp(normalizedOptions: NormalizedSchema, tree: Tree) {
  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.androidAppRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.androidAppRoot}/src`,
    targets: {
      build: {
        executor: `@jnxplus/nx-gradle:build`,
      },
      serve: {},
      lint: {
        executor: `@jnxplus/nx-gradle:lint`,
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: `@jnxplus/nx-gradle:test`,
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  addProjectConfiguration(
    tree,
    normalizedOptions.androidAppName,
    projectConfiguration
  );

  addAndroidFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, {
    projectRoot: normalizedOptions.androidAppRoot,
  });
}

function generateIosApp(normalizedOptions: NormalizedSchema, tree: Tree) {
  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.iosAppRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.iosAppRoot}/src`,
    targets: {},
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  addProjectConfiguration(
    tree,
    normalizedOptions.iosAppName,
    projectConfiguration
  );

  addIosFiles(tree, normalizedOptions);
}

function generateDesktopApp(normalizedOptions: NormalizedSchema, tree: Tree) {
  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.desktopAppRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.desktopAppRoot}/src`,
    targets: {
      build: {
        executor: `@jnxplus/nx-gradle:build`,
      },
      serve: {},
      lint: {
        executor: `@jnxplus/nx-gradle:lint`,
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: `@jnxplus/nx-gradle:test`,
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  addProjectConfiguration(
    tree,
    normalizedOptions.desktopAppName,
    projectConfiguration
  );

  addDesktopFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, {
    projectRoot: normalizedOptions.desktopAppRoot,
  });
}

function generateSharedLib(normalizedOptions: NormalizedSchema, tree: Tree) {
  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.sharedLibRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.sharedLibRoot}/src`,
    targets: {
      build: {
        executor: `@jnxplus/nx-gradle:build`,
      },
      serve: {},
      lint: {
        executor: `@jnxplus/nx-gradle:lint`,
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: `@jnxplus/nx-gradle:test`,
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  addProjectConfiguration(
    tree,
    normalizedOptions.sharedLibName,
    projectConfiguration
  );

  addSharedFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, {
    projectRoot: normalizedOptions.sharedLibRoot,
  });
}

export default async function (
  tree: Tree,
  options: NxGradleAppGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  generateAndroidApp(normalizedOptions, tree);
  generateIosApp(normalizedOptions, tree);
  generateDesktopApp(normalizedOptions, tree);
  generateSharedLib(normalizedOptions, tree);
  await formatFiles(tree);
}
