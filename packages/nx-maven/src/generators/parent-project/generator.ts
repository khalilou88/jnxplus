import {
  MavenPluginType,
  micronautVersion,
  normalizeName,
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
import { getMavenRootDirectory } from '../../utils';
import {
  addMissedProperties,
  addProjectToAggregator,
} from '../../utils/generators';
import { NxMavenParentProjectGeneratorSchema } from './schema';

export default async function (
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
) {
  await parentProjectGenerator(__dirname, '@jnxplus/nx-maven', tree, options);
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
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
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

  const projectRoot = joinPathFragments(mavenRootDirectory, projectDirectory);

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let parentProjectRoot = mavenRootDirectory;
  if (options.parentProject) {
    parentProjectRoot = readProjectConfiguration(
      tree,
      options.parentProject,
    ).root;
  }

  let relativePath = '';
  let parentGroupId = '';
  let parentProjectName = '';
  let parentProjectVersion = '';

  const parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);
  relativePath = path
    .relative(projectRoot, parentProjectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  parentGroupId = pomXmlContent?.childNamed('groupId')?.val || 'parentGroupId';
  parentProjectName =
    pomXmlContent?.childNamed('artifactId')?.val || 'parentProjectName';
  parentProjectVersion =
    pomXmlContent?.childNamed('version')?.val || 'parentProjectVersion';

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
  };
}

function addFiles(d: string, tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
  };
  generateFiles(
    tree,
    path.join(d, 'files'),
    options.projectRoot,
    templateOptions,
  );
}

async function parentProjectGenerator(
  d: string,
  plugin: MavenPluginType,
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema,
) {
  const normalizedOptions = normalizeOptions(tree, options);

  addMissedProperties(plugin, tree, {
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
        executor: `${plugin}:run-task`,
        options: {
          task: 'install',
        },
      },
    },
    tags: normalizedOptions.parsedTags,
  });

  addFiles(d, tree, normalizedOptions);
  addProjectToAggregator(tree, {
    projectRoot: normalizedOptions.projectRoot,
    aggregatorProject: normalizedOptions.aggregatorProject,
    mavenRootDirectory: normalizedOptions.mavenRootDirectory,
  });
  await formatFiles(tree);
}
