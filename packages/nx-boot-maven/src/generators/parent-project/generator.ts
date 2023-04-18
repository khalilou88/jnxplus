import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';
import { normalizeName } from '../../utils/command';
import { readXmlTree, xmlToString } from '../../utils/xml';
import { NxBootMavenParentProjectGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootMavenParentProjectGeneratorSchema {
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
  options: NxBootMavenParentProjectGeneratorSchema
): NormalizedSchema {
  const simpleProjectName = names(normalizeName(options.name)).fileName;
  const projectName = options.directory
    ? `${normalizeName(names(options.directory).fileName)}-${simpleProjectName}`
    : simpleProjectName;
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

  let parentProjectRoot;
  let parentProjectPomPath;
  if (options.parentProject) {
    parentProjectRoot = readProjectConfiguration(
      tree,
      options.parentProject
    ).root;
    parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');
  } else {
    parentProjectRoot = '';
    parentProjectPomPath = 'pom.xml';
  }

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);
  const relativePath = path
    .relative(projectRoot, parentProjectRoot)
    .replace(new RegExp(/\\/, 'g'), '/');

  const parentGroupId = pomXmlContent.childNamed('groupId').val;
  const parentProjectName = pomXmlContent.childNamed('artifactId').val;
  const parentProjectVersion = pomXmlContent.childNamed('version').val;

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
  options: NxBootMavenParentProjectGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: normalizedOptions.projectType,
    targets: {
      build: {
        executor: '@jnxplus/nx-boot-maven:run-task',
        options: {
          task: '-no-transfer-progress clean install -N',
        },
      },
      'run-task': {
        executor: '@jnxplus/nx-boot-maven:run-task',
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

  modules.children.push(fragment);

  tree.write(parentProjectPomPath, xmlToString(xmldoc));
}
