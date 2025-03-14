import {
  TemplateOptionsType,
  generatePackageDirectory,
  generatePackageName,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
  getBuildTargetName,
  getTestTargetName,
  parseProjects,
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
  addLibraryToProjects,
  addProjectToAggregator,
  getAggregatorProjectRoot,
  getMavenRootDirectory,
  getParentProjectValues,
  getPlugin,
} from '../../utils';
import { NxMavenLibGeneratorSchema } from './schema';

export default async function (tree: Tree, options: NxMavenLibGeneratorSchema) {
  await libraryGenerator(tree, options);
}

interface NormalizedSchema extends NxMavenLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
  parentGroupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  relativePath: string;
  mavenRootDirectory: string;
  buildTargetName: string;
  testTargetName: string;
  aggregatorProjectRoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenLibGeneratorSchema,
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

  const packageName = generatePackageName(simpleProjectName, {
    simplePackageName: options.simplePackageName,
    groupId: options.groupId,
    directory: options.directory,
  });

  const packageDirectory = generatePackageDirectory(packageName);

  const parsedProjects = parseProjects(options.projects);

  const [relativePath, parentProjectName, parentGroupId, parentProjectVersion] =
    getParentProjectValues(
      tree,
      mavenRootDirectory,
      projectRoot,
      options.parentProject,
    );

  const plugin = getPlugin();
  const buildTargetName = getBuildTargetName(plugin);
  const testTargetName = getTestTargetName(plugin);

  const aggregatorProjectRoot = getAggregatorProjectRoot(
    tree,
    options.aggregatorProject,
    mavenRootDirectory,
  );

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    packageName,
    packageDirectory,
    parsedProjects,
    parentGroupId,
    parentProjectName,
    parentProjectVersion,
    relativePath,
    mavenRootDirectory,
    buildTargetName,
    testTargetName,
    aggregatorProjectRoot,
  };
}

function addSpringBootFiles(
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'spring-boot', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloService.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloServiceTests.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/TestConfiguration.${fileExtension}`,
      ),
    );

    if (options.language === 'kotlin') {
      tree.delete(
        joinPathFragments(
          options.projectRoot,
          `/src/test/resources/junit-platform.properties`,
        ),
      );
    }
  }
}

function addQuarkusFiles(
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'quarkus', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/GreetingService.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/GreetingServiceTest.${fileExtension}`,
      ),
    );
  }
}

function addMicronautFiles(
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'micronaut', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/HelloService.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/HelloServiceTest.${fileExtension}`,
      ),
    );
  }
}

function addNoneFiles(
  tree: Tree,
  options: NormalizedSchema,
  templateOptions: TemplateOptionsType,
) {
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'none', options.language),
    options.projectRoot,
    templateOptions,
  );

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/Library.${fileExtension}`,
      ),
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/LibraryTest.${fileExtension}`,
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
    addSpringBootFiles(tree, options, templateOptions);
  }

  if (options.framework === 'quarkus') {
    addQuarkusFiles(tree, options, templateOptions);
  }

  if (options.framework === 'micronaut') {
    addMicronautFiles(tree, options, templateOptions);
  }

  if (options.framework === 'none') {
    addNoneFiles(tree, options, templateOptions);
  }
}

async function libraryGenerator(
  tree: Tree,
  options: NxMavenLibGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `./${normalizedOptions.projectRoot}/src`,
    targets: {
      [normalizedOptions.buildTargetName]: {
        executor: '@jnxplus/nx-maven:run-task',
        outputs: ['{projectRoot}/target', '{options.outputDirLocalRepo}'],
        options: {
          task: 'install -DskipTests=true',
        },
      },
      [normalizedOptions.testTargetName]: {
        executor: '@jnxplus/nx-maven:run-task',
        options: {
          task: 'test',
        },
        dependsOn: [`^${normalizedOptions.buildTargetName}`],
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );

  addFiles(tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProjectRoot: normalizedOptions.aggregatorProjectRoot,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });
  addLibraryToProjects(tree, normalizedOptions);
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
