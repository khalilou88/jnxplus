import {
  DSLType,
  VersionManagementType,
  clearEmpties,
  generateAppClassName,
  generatePackageDirectory,
  generatePackageName,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
  isCustomPortFunction,
  parseTags,
} from '@jnxplus/common';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import {
  addProjectToGradleSetting,
  findQuarkusVersion,
  getDsl,
  getGradleRootDirectory,
  getVersionManagement,
} from '../../utils';
import { NxGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
) {
  await applicationGenerator(tree, options);
}

interface NormalizedSchema extends NxGradleAppGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  isCustomPort: boolean;
  dsl: DSLType;
  kotlinExtension: string;
  quarkusVersion: string;
  gradleRootDirectory: string;
  versionManagement: VersionManagementType;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
): NormalizedSchema {
  const simpleProjectName = generateSimpleProjectName({
    name: options.name,
  });

  const projectName = generateProjectName(simpleProjectName, {
    name: options.name,
    simpleName: options.simpleName,
    directory: options.directory,
  });

  const projectDirectory = generateProjectDirectory(simpleProjectName, {
    directory: options.directory,
  });

  const gradleRootDirectory = getGradleRootDirectory();
  const projectRoot = generateProjectRoot(
    gradleRootDirectory,
    projectDirectory,
  );

  const parsedTags = parseTags(options.tags);

  const appClassName = generateAppClassName(projectName, {
    framework: options.framework,
  });

  const packageName = generatePackageName(simpleProjectName, {
    simplePackageName: options.simplePackageName,
    groupId: options.groupId,
    directory: options.directory,
  });

  const packageDirectory = generatePackageDirectory(packageName);

  const isCustomPort = isCustomPortFunction({ port: options.port });

  const dsl = getDsl(tree, gradleRootDirectory);
  const kotlinExtension = dsl === 'kotlin' ? '.kts' : '';

  const versionManagement = getVersionManagement(tree, gradleRootDirectory);

  const qVersion = findQuarkusVersion(
    options.framework,
    gradleRootDirectory,
    versionManagement,
  );

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    appClassName,
    packageName,
    packageDirectory,
    isCustomPort,
    dsl,
    kotlinExtension,
    quarkusVersion: qVersion,
    gradleRootDirectory,
    versionManagement,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  if (options.framework === 'spring-boot') {
    addBootFiles(tree, options);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(tree, options);
  }

  if (options.framework === 'micronaut') {
    addMicronautFiles(tree, options);
  }

  if (options.framework === 'none') {
    addNoneFiles(tree, options);
  }
}

function addNoneFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'none', options.language),
    options.projectRoot,
    templateOptions,
  );

  const fileExtension = options.language === 'java' ? 'java' : 'kt';

  if (options.minimal) {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/App.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/AppTest.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/resources/application${options.configFormat}`,
      ),
    );
  }
}

function addBootFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'boot', options.language),
    options.projectRoot,
    templateOptions,
  );

  const fileExtension = options.language === 'java' ? 'java' : 'kt';

  if (options.packaging === 'jar') {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/ServletInitializer.${fileExtension}`,
      ),
    );
  }

  if (options.minimal) {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloController.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloControllerTests.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/resources/application${options.configFormat}`,
      ),
    );

    if (options.language === 'kotlin') {
      tree.delete(
        joinPathFragments(
          options.projectRoot,
          '/src/test/resources/junit-platform.properties',
        ),
      );
    }
  }
}

function addQuarkusFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'quarkus', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.minimal) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/GreetingResource.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/GreetingResourceTest.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/native-test/${options.language}/${options.packageDirectory}/GreetingResourceIT.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/resources/META-INF/resources/index.html`,
      ),
    );
  }
}

function addMicronautFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'micronaut', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.minimal) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloController.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloControllerTest.${fileExtension}`,
      ),
    );
  }
}

async function applicationGenerator(
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `./${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@jnxplus/nx-gradle:run-task',
        outputs: [`{projectRoot}/build`],
        options: {
          task: 'build',
        },
      },
      'build-image': {},
      serve: {
        executor: '@jnxplus/nx-gradle:run-task',
        options: {
          task: 'run',
        },
      },
      test: {
        executor: '@jnxplus/nx-gradle:run-task',
        options: {
          task: 'test',
        },
      },
      'integration-test': {},
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  if (options.framework === 'spring-boot') {
    targets['build'].options = {
      ...targets['build'].options,
      task: normalizedOptions.packaging === 'war' ? 'bootWar' : 'bootJar',
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'bootRun',
      keepItRunning: true,
    };

    targets['build-image'] = {
      executor: '@jnxplus/nx-gradle:run-task',
      options: {
        task: 'bootBuildImage',
      },
    };
  }

  if (options.framework === 'quarkus') {
    targets['build'].options = {
      ...targets['build'].options,
      task: 'quarkusBuild',
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'quarkusDev',
      keepItRunning: true,
    };

    targets['build-image'] = {
      executor: '@jnxplus/nx-gradle:quarkus-build-image',
    };

    targets['integration-test'] = {
      executor: '@jnxplus/nx-gradle:run-task',
      options: {
        task: 'quarkusIntTest',
      },
    };
  }

  if (options.framework === 'micronaut') {
    targets['build-image'] = {
      executor: '@jnxplus/nx-gradle:run-task',
      options: {
        task: 'dockerBuild',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      keepItRunning: true,
    };
  }

  clearEmpties(targets);

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );

  addFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  await formatFiles(tree);
}
