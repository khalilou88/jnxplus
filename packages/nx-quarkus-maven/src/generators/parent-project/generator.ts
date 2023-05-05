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
import { XmlDocument } from 'xmldoc';
import { normalizeName } from '@jnxplus/common';
import { readXmlTree, xmlToString } from '@jnxplus/common';
import { NxQuarkusMavenParentProjectGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusMavenParentProjectGeneratorSchema {
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
  options: NxQuarkusMavenParentProjectGeneratorSchema
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
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxQuarkusMavenParentProjectGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: normalizedOptions.projectType,
    targets: {
      build: {
        executor: '@jnxplus/nx-quarkus-maven:build',
      },
    },
    tags: normalizedOptions.parsedTags,
  });

  addFiles(tree, normalizedOptions);
  addProjectToParentPomXml(tree, normalizedOptions);
  await formatFiles(tree);
}

function addProjectToParentPomXml(tree: Tree, options: NormalizedSchema) {
  const parentProjectPomPath = path.join(options.parentProjectRoot, 'pom.xml');
  const xmldoc = readXmlTree(tree, parentProjectPomPath);

  const relativePath = path
    .relative(options.parentProjectRoot, options.projectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  const fragment = new XmlDocument(`<module>${relativePath}</module>`);

  let modules = xmldoc.childNamed('modules');

  if (modules === undefined) {
    xmldoc.children.push(
      new XmlDocument(`
    <modules>
    </modules>
  `)
    );
    modules = xmldoc.childNamed('modules');
  }

  if (modules === undefined) {
    throw new Error('Modules tag undefined');
  }

  modules.children.push(fragment);

  tree.write(parentProjectPomPath, xmlToString(xmldoc));
}
