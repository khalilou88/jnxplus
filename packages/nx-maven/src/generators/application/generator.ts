import {
  clearEmpties,
  generateAppClassName,
  generatePackageDirectory,
  generatePackageName,
  generateParsedTags,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
  isCustomPortFunction,
  micronautVersion,
  quarkusVersion,
  springBootVersion,
} from '@jnxplus/common';
import { readXmlTree } from '@jnxplus/xml';
import {
  ProjectConfiguration,
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  offsetFromRoot,
  readProjectConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import {
  addMissedProperties,
  addProjectToAggregator,
  getArtifactId,
  getDependencyManagement,
  getGroupId,
  getMavenRootDirectory,
  getVersion,
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
  parentProjectRoot: string;
  isCustomPort: boolean;
  springBootVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  dependencyManagement:
    | 'bom'
    | 'spring-boot-parent-pom'
    | 'micronaut-parent-pom';
  mavenRootDirectory: string;
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

  const parsedTags = generateParsedTags({ tags: options.tags });

  const appClassName = generateAppClassName(projectName, {
    framework: options.framework,
  });

  const packageName = generatePackageName(simpleProjectName, {
    simplePackageName: options.simplePackageName,
    groupId: options.groupId,
    directory: options.directory,
  });

  const packageDirectory = generatePackageDirectory(packageName);

  const rootPomXmlContent = readXmlTree(
    tree,
    path.join(mavenRootDirectory, 'pom.xml'),
  );

  const rootParentProjectName = getArtifactId(rootPomXmlContent);

  const parentProjectRoot =
    options.parentProject && options.parentProject !== rootParentProjectName
      ? readProjectConfiguration(tree, options.parentProject).root
      : mavenRootDirectory
        ? mavenRootDirectory
        : '';

  const parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);
  const relativePath = joinPathFragments(
    path.relative(projectRoot, parentProjectRoot),
    'pom.xml',
  );

  const parentProjectName = getArtifactId(pomXmlContent);
  const parentGroupId = getGroupId(parentProjectName, pomXmlContent);
  const parentProjectVersion = getVersion(parentProjectName, pomXmlContent);

  const isCustomPort = isCustomPortFunction({ port: options.port });

  let quarkusVersion = '';
  if (options.framework === 'quarkus') {
    quarkusVersion =
      rootPomXmlContent?.childNamed('properties')?.childNamed('quarkus.version')
        ?.val || 'quarkusVersion';
  }

  const dependencyManagement = getDependencyManagement(rootPomXmlContent);

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
    parentProjectRoot,
    isCustomPort,
    springBootVersion,
    quarkusVersion,
    micronautVersion,
    dependencyManagement,
    mavenRootDirectory,
  };
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

function addFiles(tree: Tree, options: NormalizedSchema) {
  if (options.framework === 'spring-boot') {
    addBootFiles(__dirname, tree, options);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(__dirname, tree, options);
  }

  if (options.framework === 'micronaut') {
    addMicronautFiles(__dirname, tree, options);
  }

  if (options.framework === 'none') {
    addNoneFiles(__dirname, tree, options);
  }
}

async function applicationGenerator(
  tree: Tree,
  options: NxMavenAppGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  addMissedProperties(tree, {
    framework: options.framework,
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
      build: {
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
        dependsOn: ['build'],
      },
      test: {
        executor: '@jnxplus/nx-maven:run-task',
        options: {
          task: 'test',
        },
        dependsOn: ['^build'],
      },
      'integration-test': {},
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  if (options.framework === 'spring-boot') {
    targets['build'].options = {
      ...targets['build'].options,
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
      keepItRunning: true,
    };
    targets['serve'].dependsOn = ['^build'];
  }

  if (options.framework === 'quarkus') {
    targets['build-image'] = {
      executor: '@jnxplus/nx-maven:quarkus-build-image',
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'quarkus:dev',
      keepItRunning: true,
    };
    targets['serve'].dependsOn = ['^build'];

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
      keepItRunning: true,
    };
    targets['serve'].dependsOn = ['^build'];
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
