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
import { LinterType } from '../../utils/types';
import { readXmlTree, xmlToString } from '../../utils/xml';
import { NxBootMavenAppGeneratorSchema } from './schema';

interface NormalizedSchema extends NxBootMavenAppGeneratorSchema {
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
}

function normalizeOptions(
  tree: Tree,
  options: NxBootMavenAppGeneratorSchema
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

  const parentGroupId = pomXmlContent.childNamed('groupId').val;
  const parentProjectName = pomXmlContent.childNamed('artifactId').val;
  const parentProjectVersion = pomXmlContent.childNamed('version').val;

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
    path.join(__dirname, 'files', options.language),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  options: NxBootMavenAppGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.language === 'java') {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'application',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-boot-maven:build',
          outputs: [`${normalizedOptions.projectRoot}/target`],
        },
        'build-image': {
          executor: '@jnxplus/nx-boot-maven:build-image',
        },
        serve: {
          executor: '@jnxplus/nx-boot-maven:serve',
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
        },
        lint: {
          executor: '@jnxplus/nx-boot-maven:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-boot-maven:test',
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  } else {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'application',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-boot-maven:build',
          outputs: [`${normalizedOptions.projectRoot}/target`],
        },
        'build-image': {
          executor: '@jnxplus/nx-boot-maven:build-image',
        },
        serve: {
          executor: '@jnxplus/nx-boot-maven:serve',
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
        },
        lint: {
          executor: '@jnxplus/nx-boot-maven:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-boot-maven:test',
          dependsOn: [
            {
              target: 'build',
              projects: 'self',
            },
          ],
        },
        kformat: {
          executor: '@jnxplus/nx-boot-maven:kformat',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  }

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
