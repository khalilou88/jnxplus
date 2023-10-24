import {
  clearEmpties,
  DSLType,
  GradlePluginType,
  normalizeName,
  quarkusVersion,
} from '@jnxplus/common';
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  Tree,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  addProjectToGradleSetting,
  getDsl,
  getGradleRootDirectory,
  getQuarkusVersion,
} from '../../utils';
import { NxGradleAppGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
) {
  await applicationGenerator(__dirname, '@jnxplus/nx-gradle', tree, options);
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
}

function normalizeOptions(
  plugin: GradlePluginType,
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;

  let projectName: string;
  if (options.simpleName) {
    projectName = simpleProjectName;
  } else {
    projectName = options.directory
      ? `${normalizeName(
          names(options.directory).fileName,
        )}-${simpleProjectName}`
      : simpleProjectName;
  }

  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${simpleProjectName}`
    : simpleProjectName;

  const gradleRootDirectory = getGradleRootDirectory();
  const projectRoot = joinPathFragments(gradleRootDirectory, projectDirectory);

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let appClassName = '';
  if (options.framework === 'micronaut') {
    appClassName = names(projectName).className;
  } else {
    appClassName = `${names(projectName).className}Application`;
  }

  let packageName: string;
  if (options.simplePackageName) {
    packageName = `${options.groupId}.${names(
      simpleProjectName,
    ).className.toLocaleLowerCase()}`.replace(new RegExp(/-/, 'g'), '');
  } else {
    packageName = `${options.groupId}.${
      options.directory
        ? `${names(options.directory).fileName.replace(
            new RegExp(/\//, 'g'),
            '.',
          )}.${names(simpleProjectName).className.toLocaleLowerCase()}`
        : names(simpleProjectName).className.toLocaleLowerCase()
    }`.replace(new RegExp(/-/, 'g'), '');
  }

  const packageDirectory = packageName.replace(new RegExp(/\./, 'g'), '/');

  const isCustomPort = !!options.port && +options.port !== 8080;

  const dsl = getDsl(tree, gradleRootDirectory);
  const kotlinExtension = dsl === 'kotlin' ? '.kts' : '';

  let qVersion = '';
  if (options.framework === 'quarkus') {
    const gradlePropertiesPath = path.join(
      workspaceRoot,
      gradleRootDirectory,
      'gradle.properties',
    );
    const gradlePropertiesContent = fs.readFileSync(
      gradlePropertiesPath,
      'utf-8',
    );
    qVersion = getQuarkusVersion(gradlePropertiesContent);
    if (quarkusVersion === undefined) {
      qVersion = quarkusVersion;
    }
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
    isCustomPort,
    dsl,
    kotlinExtension,
    quarkusVersion: qVersion,
    gradleRootDirectory,
  };
}

function addFiles(
  d: string,
  plugin: GradlePluginType,
  tree: Tree,
  options: NormalizedSchema,
) {
  if (options.framework === 'spring-boot') {
    addBootFiles(d, tree, options);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(d, tree, options);
  }

  if (options.framework === 'micronaut') {
    addMicronautFiles(d, tree, options);
  }

  if (options.framework === 'none') {
    addNoneFiles(d, tree, options);
  }
}

function addNoneFiles(d: string, tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(d, 'files', 'none', options.language),
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

function addBootFiles(d: string, tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(d, 'files', 'boot', options.language),
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

function addQuarkusFiles(d: string, tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(d, 'files', 'quarkus', options.language),
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
  } else {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/.gitkeep`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/.gitkeep`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/native-test/${options.language}/.gitkeep`,
      ),
    );
  }
}

function addMicronautFiles(d: string, tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(d, 'files', 'micronaut', options.language),
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
  } else {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/.gitkeep`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/.gitkeep`,
      ),
    );
  }
}

async function applicationGenerator(
  d: string,
  plugin: GradlePluginType,
  tree: Tree,
  options: NxGradleAppGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(plugin, tree, options);

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `./${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: `${plugin}:run-task`,
        outputs: [`{projectRoot}/build`],
        options: {
          task: 'build',
        },
      },
      'build-image': {},
      serve: {
        executor: `${plugin}:run-task`,
        options: {
          task: 'run',
        },
      },
      test: {
        executor: `${plugin}:run-task`,
        options: {
          task: 'test',
        },
      },
      'integration-test': {},
      ktformat: {},
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
      executor: `${plugin}:run-task`,
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
      executor: `${plugin}:quarkus-build-image`,
    };

    targets['integration-test'] = {
      executor: `${plugin}:run-task`,
      options: {
        task: 'quarkusIntTest',
      },
    };
  }

  if (options.framework === 'micronaut') {
    targets['build-image'] = {
      executor: `${plugin}:run-task`,
      options: {
        task: 'dockerBuild',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      keepItRunning: true,
    };
  }

  if (options.language === 'kotlin') {
    targets['ktformat'] = {
      executor: `${plugin}:ktformat`,
    };
  }

  clearEmpties(targets);

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );

  addFiles(d, plugin, tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  await formatFiles(tree);
}
