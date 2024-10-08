import {
  DSLType,
  TemplateOptionsType,
  VersionManagementType,
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
  addProjectToGradleSetting,
  getDsl,
  getGradleRootDirectory,
  getPlugin,
  getVersionManagement,
} from '../../utils';
import { addMissingCode } from '../../utils/libs-versions-toml';
import { NxGradleLibGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxGradleLibGeneratorSchema,
) {
  await libraryGenerator(tree, options);
}

interface NormalizedSchema extends NxGradleLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
  dsl: DSLType;
  kotlinExtension: string;
  gradleRootDirectory: string;
  versionManagement: VersionManagementType;
  buildTargetName: string;
  testTargetName: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxGradleLibGeneratorSchema,
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

  const packageName = generatePackageName(simpleProjectName, {
    simplePackageName: options.simplePackageName,
    groupId: options.groupId,
    directory: options.directory,
  });

  const packageDirectory = generatePackageDirectory(packageName);

  const parsedProjects = parseProjects(options.projects);

  const dsl = getDsl(tree, gradleRootDirectory);
  const kotlinExtension = dsl === 'kotlin' ? '.kts' : '';

  const versionManagement = getVersionManagement(tree, gradleRootDirectory);

  const plugin = getPlugin();
  const buildTargetName = getBuildTargetName(plugin);
  const testTargetName = getTestTargetName(plugin);

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    packageName,
    packageDirectory,
    parsedProjects,
    dsl,
    kotlinExtension,
    gradleRootDirectory,
    versionManagement,
    buildTargetName,
    testTargetName,
  };
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

async function libraryGenerator(
  tree: Tree,
  options: NxGradleLibGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  await addMissingCode(
    tree,
    normalizedOptions.versionManagement,
    normalizedOptions.gradleRootDirectory,
    options.framework,
    options.language,
  );

  const projectConfiguration: ProjectConfiguration = {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `./${normalizedOptions.projectRoot}/src`,
    targets: {
      [normalizedOptions.buildTargetName]: {
        executor: '@jnxplus/nx-gradle:run-task',
        outputs: [`{projectRoot}/build`],
        options: {
          task: 'build',
        },
      },
      [normalizedOptions.testTargetName]: {
        executor: '@jnxplus/nx-gradle:run-task',
        options: {
          task: 'test',
        },
      },
    },
    tags: normalizedOptions.parsedTags,
  };

  const targets = projectConfiguration.targets ?? {};

  if (options.framework === 'spring-boot') {
    targets['build'].options = {
      ...targets['build'].options,
      task: 'jar',
    };
  }

  addProjectConfiguration(
    tree,
    normalizedOptions.projectName,
    projectConfiguration,
  );
  addFiles(tree, normalizedOptions);
  addProjectToGradleSetting(tree, normalizedOptions);
  addLibraryToProjects(tree, normalizedOptions);
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}
