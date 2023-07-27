import { MavenPluginType, normalizeName } from '@jnxplus/common';
import { addProjectToAggregator } from '../../lib/utils/generators';
import { readXmlTree } from '../../lib/xml/index';
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { NxMavenParentProjectGeneratorSchema } from './schema';

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
}

function normalizeOptions(
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema
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

  let projectRoot: string;
  if (options.projectType === 'application') {
    projectRoot = `${getWorkspaceLayout(tree).appsDir}/${projectDirectory}`;
  } else {
    projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  }

  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  let parentProjectRoot = '';
  if (options.parentProject) {
    parentProjectRoot = readProjectConfiguration(
      tree,
      options.parentProject
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
    templateOptions
  );
}

export default async function (
  d: string,
  plugin: MavenPluginType,
  tree: Tree,
  options: NxMavenParentProjectGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

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
  });
  await formatFiles(tree);
}
