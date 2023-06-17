import { LinterType, normalizeName } from '@jnxplus/common';
import { addProjectToAggregator, readXmlTree } from '@jnxplus/maven';
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  ProjectConfiguration,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { NxMavenAppGeneratorSchema } from './schema';

interface NormalizedSchema extends NxMavenAppGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  appClassName: string;
  packageName: string;
  packageDirectory: string;
  linter: LinterType;
  parentGroupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  relativePath: string;
  parentProjectRoot: string;
  isCustomPort: boolean;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenAppGeneratorSchema
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

  const parentProjectRoot = options.parentProject
    ? readProjectConfiguration(tree, options.parentProject).root
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
    parentGroupId,
    parentProjectName,
    parentProjectVersion,
    relativePath,
    parentProjectRoot,
    isCustomPort,
  };
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
    templateOptions
  );

  const fileExtension = options.language === 'java' ? 'java' : 'kt';

  if (options.packaging === 'jar') {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/ServletInitializer.${fileExtension}`
      )
    );
  }

  if (options.minimal) {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloController.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloControllerTests.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/resources/application${options.configFormat}`
      )
    );

    if (options.language === 'kotlin') {
      tree.delete(
        joinPathFragments(
          options.projectRoot,
          '/src/test/resources/junit-platform.properties'
        )
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
    templateOptions
  );

  if (options.minimal) {
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
  }
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  if (options.framework === 'spring-boot') {
    addBootFiles(tree, options);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(tree, options);
  }
}

export default async function (tree: Tree, options: NxMavenAppGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'application',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@jnxplus/nx-maven:build',
        outputs: [`${normalizedOptions.projectRoot}/target`],
      },
      'build-image': {
        executor: '@jnxplus/nx-maven:build-image',
      },
      serve: {
        executor: '@jnxplus/nx-maven:serve',
        dependsOn: ['build'],
      },
      lint: {
        executor: '@jnxplus/nx-maven:lint',
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: '@jnxplus/nx-maven:test',
        dependsOn: ['build'],
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  if (options.language === 'kotlin') {
    targets['ktformat'] = {
      executor: '@jnxplus/nx-maven:ktformat',
    };
  }

  if (options.framework !== 'none') {
    targets['build'].options = {
      ...targets['build'].options,
      framework: options.framework,
    };

    targets['build-image'].options = {
      ...targets['build-image'].options,
      framework: options.framework,
    };

    targets['serve'].options = {
      ...targets['serve'].options,
      framework: options.framework,
    };
  }

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration
  );

  addFiles(tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProject: normalizedOptions.aggregatorProject,
  });
  await formatFiles(tree);
}
