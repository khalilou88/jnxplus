import {
  MavenPluginType,
  clearEmpties,
  micronautVersion,
  normalizeName,
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
  getDependencyManagement,
  getMavenRootDirectory,
} from '../../utils';
import { NxMavenAppGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  await applicationGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
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
  plugin: MavenPluginType;
  dependencyManagement:
    | 'bom'
    | 'spring-boot-parent-pom'
    | 'micronaut-parent-pom';
  mavenRootDirectory: string;
}

function normalizeOptions(
  plugin: MavenPluginType,
  tree: Tree,
  options: NxMavenAppGeneratorSchema,
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

  const mavenRootDirectory = getMavenRootDirectory();
  const projectRoot = joinPathFragments(
    mavenRootDirectory,
    `${projectDirectory}`,
  );
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

  const rootPomXmlContent = readXmlTree(
    tree,
    path.join(mavenRootDirectory, 'pom.xml'),
  );
  const rootParentProjectName =
    rootPomXmlContent?.childNamed('artifactId')?.val;

  const parentProjectRoot =
    options.parentProject && options.parentProject !== rootParentProjectName
      ? readProjectConfiguration(tree, options.parentProject).root
      : mavenRootDirectory
      ? mavenRootDirectory
      : '';

  const parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);
  const relativePath = path
    .relative(projectRoot, parentProjectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  const parentGroupId =
    pomXmlContent?.childNamed('groupId')?.val || 'parentGroupId';
  const parentProjectName =
    pomXmlContent?.childNamed('artifactId')?.val || 'parentProjectName';
  const parentProjectVersion =
    pomXmlContent?.childNamed('version')?.val || 'parentProjectVersion';

  const isCustomPort = !!options.port && +options.port !== 8080;

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
    plugin,
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

function addFiles(
  d: string,
  plugin: MavenPluginType,
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

async function applicationGenerator(
  d: string,
  plugin: MavenPluginType,
  tree: Tree,
  options: NxMavenAppGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(plugin, tree, options);

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
        executor: `${plugin}:run-task`,
        outputs: [`{projectRoot}/target`],
        options: {
          task: 'compile -DskipTests=true',
        },
      },
      'build-image': {},
      serve: {
        executor: `${plugin}:run-task`,
        options: {
          task: 'exec:java',
        },
        dependsOn: ['build'],
      },
      test: {
        executor: `${plugin}:run-task`,
        options: {
          task: 'test',
        },
        dependsOn: ['build'],
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
      executor: `${plugin}:run-task`,
      options: {
        task: 'spring-boot:build-image',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'spring-boot:run',
      keepItRunning: true,
    };
  }

  if (options.framework === 'quarkus') {
    targets['build-image'] = {
      executor: `${plugin}:quarkus-build-image`,
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'quarkus:dev',
      keepItRunning: true,
    };

    targets['integration-test'] = {
      executor: `${plugin}:run-task`,
      options: {
        task: 'integration-test',
      },
    };
  }

  if (options.framework === 'micronaut') {
    targets['build-image'] = {
      executor: `${plugin}:run-task`,
      options: {
        task: 'package -Dpackaging=docker',
      },
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      task: 'mn:run',
      keepItRunning: true,
    };
  }

  clearEmpties(targets);

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );

  addFiles(d, plugin, tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProject: normalizedOptions.aggregatorProject,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });
  await formatFiles(tree);
}
