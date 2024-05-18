import {
  parseTags,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
  kotlinVersion,
  mavenCompilerPluginVersion,
  mavenEnforcerPluginVersion,
  mavenFailsafePluginVersion,
  mavenResourcesPluginVersion,
  mavenSurefirePluginVersion,
  mavenWarPluginVersion,
  micronautCoreVersion,
  micronautMavenPluginVersion,
  micronautSerializationVersion,
  micronautTestResourcesVersion,
  micronautVersion,
  quarkusVersion,
  springBootVersion,
} from '@jnxplus/common';
import {
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
} from '@nx/devkit';
import * as path from 'path';
import {
  addMissedProperties,
  addProjectToAggregator,
  getBuildTargetName,
  getMavenRootDirectory,
  getParentProjectValues,
} from '../../utils';
import { NxMavenParentProjectGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
) {
  await parentProjectGenerator(tree, options);
}

interface NormalizedSchema extends NxMavenParentProjectGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  parentGroupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  relativePath: string;
  springBootVersion: string;
  quarkusVersion: string;
  micronautVersion: string;
  mavenRootDirectory: string;
  micronautCoreVersion: string;
  micronautSerializationVersion: string;
  micronautTestResourcesVersion: string;
  micronautMavenPluginVersion: string;
  mavenCompilerPluginVersion: string;
  mavenEnforcerPluginVersion: string;
  mavenResourcesPluginVersion: string;
  mavenWarPluginVersion: string;
  mavenSurefirePluginVersion: string;
  mavenFailsafePluginVersion: string;
  buildTargetName: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
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

  const [relativePath, parentProjectName, parentGroupId, parentProjectVersion] =
    getParentProjectValues(
      tree,
      mavenRootDirectory,
      projectRoot,
      options.parentProject,
    );

  const buildTargetName = getBuildTargetName();

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    parentGroupId,
    parentProjectName,
    parentProjectVersion,
    relativePath,
    springBootVersion,
    quarkusVersion,
    micronautVersion,
    mavenRootDirectory,
    micronautCoreVersion,
    micronautSerializationVersion,
    micronautTestResourcesVersion,
    micronautMavenPluginVersion,
    mavenCompilerPluginVersion,
    mavenEnforcerPluginVersion,
    mavenResourcesPluginVersion,
    mavenWarPluginVersion,
    mavenSurefirePluginVersion,
    mavenFailsafePluginVersion,
    buildTargetName,
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
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions,
  );
}

async function parentProjectGenerator(
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  const language =
    options.language === 'kotlin' || options.language === 'java-kotlin'
      ? 'kotlin'
      : 'java';

  addMissedProperties(tree, {
    language: language,
    framework: options.framework,
    kotlinVersion: kotlinVersion,
    springBootVersion: springBootVersion,
    quarkusVersion: quarkusVersion,
    micronautVersion: micronautVersion,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });

  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: normalizedOptions.projectType,
    targets: {
      [normalizedOptions.buildTargetName]: {
        executor: '@jnxplus/nx-maven:run-task',
        outputs: ['{options.outputDirLocalRepo}'],
        options: {
          task: 'install',
        },
      },
    },
    tags: normalizedOptions.parsedTags,
  });

  addFiles(tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProject: normalizedOptions.aggregatorProject,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });
  await formatFiles(tree);
}
