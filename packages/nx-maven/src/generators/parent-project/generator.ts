import {
  generateParsedTags,
  generateProjectDirectory,
  generateProjectName,
  generateProjectRoot,
  generateSimpleProjectName,
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
import { readXmlTree } from '@jnxplus/xml';
import {
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
  getGroupId,
  getMavenRootDirectory,
  getVersion,
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
  parentProjectRoot: string;
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

  const parsedTags = generateParsedTags({ tags: options.tags });

  let parentProjectRoot = mavenRootDirectory;
  if (options.parentProject) {
    parentProjectRoot = readProjectConfiguration(
      tree,
      options.parentProject,
    ).root;
  }

  const parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);
  const relativePath = joinPathFragments(
    path.relative(projectRoot, parentProjectRoot),
    'pom.xml',
  );

  const parentProjectName = getArtifactId(pomXmlContent);
  const parentGroupId = getGroupId(parentProjectName, pomXmlContent);
  const parentProjectVersion = getVersion(parentProjectName, pomXmlContent);

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
    parentProjectRoot,
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

  addMissedProperties(tree, {
    framework: options.framework,
    springBootVersion: springBootVersion,
    quarkusVersion: quarkusVersion,
    micronautVersion: micronautVersion,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });

  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: normalizedOptions.projectType,
    targets: {
      build: {
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
