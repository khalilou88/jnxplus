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
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { LinterType } from '../../utils/types';
import { springBootStarterParentVersion } from '../../utils/versions';
import { NxBootGradleLibGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootGradleLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
  linter?: LinterType;
  springBootStarterParentVersion: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
): NormalizedSchema {
  const projectName = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${projectName}`
    : projectName;
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  const packageName = `${options.groupId}.${names(
    options.name
  ).className.toLocaleLowerCase()}`;
  const packageDirectory = `${options.groupId.replace(
    new RegExp(/\./, 'g'),
    '/'
  )}/${names(options.name).className.toLocaleLowerCase()}`;

  const parsedProjects = options.projects
    ? options.projects.split(',').map((s) => s.trim())
    : [];

  const linter = options.language === 'java' ? 'checkstyle' : 'ktlint';

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
    packageName,
    packageDirectory,
    parsedProjects,
    linter,
    springBootStarterParentVersion,
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
    join(__dirname, 'files', options.language),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootGradleLibGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@jnxplus/nx-boot-maven:build',
      },
      lint: {
        executor: '@jnxplus/nx-boot-maven:lint',
        options: {
          linter: `${normalizedOptions.linter}`,
        },
      },
      test: {
        executor: '@jnxplus/nx-boot-maven:test',
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  addFiles(tree, normalizedOptions);
  addProjectToParentPomXml(tree, normalizedOptions);
  addLibraryToProjects(tree, normalizedOptions);
  await formatFiles(tree);
}

export function readXml(tree: Tree, path: string): XmlDocument {
  const fileText = tree.read(path)?.toString();
  if (!fileText) {
    throw new Error(`Unable to read ${path}`);
  }
  return new XmlDocument(fileText);
}

function addProjectToParentPomXml(tree: Tree, options: NormalizedSchema) {
  const filePath = `pom.xml`;
  const xmldoc = readXml(tree, filePath);
  const fragment = new XmlDocument(`
  <module>${options.projectRoot}</module>
`);
  xmldoc.childNamed('modules').children.push(fragment);
  tree.write(filePath, xmldoc.toString());
}

function addLibraryToProjects(tree: Tree, options: NormalizedSchema) {
  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = join(projectRoot, `pom.xml`);
    const xmldoc = readXml(tree, filePath);
    const dependency = new XmlDocument(`
		<dependency>
			<groupId>${options.groupId}</groupId>
			<artifactId>${options.projectName}</artifactId>
			<version>${options.projectVersion}</version>
		</dependency>
  `);
    xmldoc.childNamed('dependencies').children.push(dependency);
    tree.write(filePath, xmldoc.toString());
  }
}
