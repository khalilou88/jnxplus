import {
  DependencyManagementType,
  TemplateOptionsType,
  clearEmpties,
  generateAppClassName,
  generateBasePackage,
  generatePackageDirectory,
  generatePackageName,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
  isCustomPortFunction,
  kotlinVersion,
  micronautVersion,
  parseTags,
  quarkusVersion,
  springBootVersion,
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
  addMissedProperties,
  addProjectToAggregator,
  extractRootPomValues,
  getBuildTargetName,
  getMavenRootDirectory,
  getParentProjectValues,
} from '../../utils';
import { NxMavenAppGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(tree, options);
}

interface NormalizedSchema extends NxMavenAppGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  parentGroupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  relativePath: string;
  isCustomPort: boolean;
  springBootVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  dependencyManagement: DependencyManagementType;
  mavenRootDirectory: string;
  basePackage: string;
  buildTargetName: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenAppGeneratorSchema,
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

  const mavenRootDirectory = getMavenRootDirectory();
  const projectRoot = generateProjectRoot(mavenRootDirectory, projectDirectory);

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

  const [relativePath, parentProjectName, parentGroupId, parentProjectVersion] =
    getParentProjectValues(
      tree,
      mavenRootDirectory,
      projectRoot,
      options.parentProject,
    );

  const isCustomPort = isCustomPortFunction({ port: options.port });

  const [quarkusVersion, dependencyManagement] = extractRootPomValues(
    tree,
    mavenRootDirectory,
    options.framework,
  );

  const basePackage = generateBasePackage(options.groupId);

  const buildTargetName = getBuildTargetName();

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    appClassName,
    packageName,
    packageDirectory,
    parentGroupId,
    parentProjectName,
    parentProjectVersion,
    relativePath,
    isCustomPort,
    springBootVersion,
    quarkusVersion,
    micronautVersion,
    dependencyManagement,
    mavenRootDirectory,
    basePackage,
    buildTargetName,
  };
}

function addNoneFiles(
  d: string,
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
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

function addSpringBootFiles(
  d: string,
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(d, 'files', 'spring-boot', options.language),
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

function addQuarkusFiles(
  d: string,
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
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
  }
}

function addMicronautFiles(
  d: string,
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(d, 'files', 'micronaut', options.language),
    options.projectRoot,
    templateOptions,
  );

  generateFiles(
    tree,
    path.join(d, 'files', 'micronaut', 'shared'),
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

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };

  if (options.framework === 'spring-boot') {
    addSpringBootFiles(__dirname, tree, options, templateOptions);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(__dirname, tree, options, templateOptions);
  }

  if (options.framework === 'micronaut') {
    addMicronautFiles(__dirname, tree, options, templateOptions);
  }

  if (options.framework === 'none') {
    addNoneFiles(__dirname, tree, options, templateOptions);
  }
}

async function applicationGenerator(
  tree: Tree,
  options: NxMavenAppGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  addMissedProperties(tree, {
    language: options.language,
    framework: options.framework,
    kotlinVersion: kotlinVersion,
    springBootVersion: springBootVersion,
    quarkusVersion: quarkusVersion,
    micronautVersion: micronautVersion,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `./${normalizedOptions.projectRoot}/src`,
    targets: {
      [normalizedOptions.buildTargetName]: {
        executor: '@jnxplus/nx-maven:run-task',
        outputs: ['{projectRoot}/target'],
        options: {
          task: 'compile -DskipTests=true',
        },
      },
      'build-image': {},
      serve: {
        executor: '@jnxplus/nx-maven:run-task',
        options: {
          task: 'exec:java',
        },
        dependsOn: [`${normalizedOptions.buildTargetName}`],
      },
      test: {
        executor: '@jnxplus/nx-maven:run-task',
        options: {
          task: 'test',
        },
        dependsOn: [`^${normalizedOptions.buildTargetName}`],
      },
      'integration-test': {},
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  if (options.framework === 'spring-boot') {
    targets[`${normalizedOptions.buildTargetName}`].options = {
      ...targets[`${normalizedOptions.buildTargetName}`].options,
      task: 'package spring-boot:repackage -DskipTests=true',
    };

    targets['build-image'] = {
      executor: '@jnxplus/nx-maven:run-task',
      options: {
        task: 'spring-boot:build-image',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'spring-boot:run',
    };
    targets['serve'].dependsOn = [`^${normalizedOptions.buildTargetName}`];
  }

  if (options.framework === 'quarkus') {
    targets['build-image'] = {
      executor: '@jnxplus/nx-maven:quarkus-build-image',
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'quarkus:dev',
    };
    targets['serve'].dependsOn = [`^${normalizedOptions.buildTargetName}`];

    targets['integration-test'] = {
      executor: '@jnxplus/nx-maven:run-task',
      options: {
        task: 'integration-test',
      },
    };
  }

  if (options.framework === 'micronaut') {
    targets['build-image'] = {
      executor: '@jnxplus/nx-maven:run-task',
      options: {
        task: 'package -Dpackaging=docker',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'mn:run',
    };
    targets['serve'].dependsOn = [`^${normalizedOptions.buildTargetName}`];
  }

  clearEmpties(targets);

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );

  addFiles(tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProject: normalizedOptions.aggregatorProject,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });
  await formatFiles(tree);
}
