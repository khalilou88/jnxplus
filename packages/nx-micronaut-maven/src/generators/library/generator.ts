import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  joinPathFragments,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';
import { normalizeName } from '@jnxplus/common';
import { LinterType } from '@jnxplus/common';
import { readXmlTree, xmlToString } from '@jnxplus/maven';
import { NxQuarkusMavenLibGeneratorSchema } from './schema';

interface NormalizedSchema extends NxQuarkusMavenLibGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
  packageName: string;
  packageDirectory: string;
  parsedProjects: string[];
  linter?: LinterType;
  parentGroupId: string;
  parentProjectName: string;
  parentProjectVersion: string;
  relativePath: string;
  parentProjectRoot: string;
}

function normalizeOptions(
  tree: Tree,
  options: NxQuarkusMavenLibGeneratorSchema
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
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

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

  const parsedProjects = options.projects
    ? options.projects.split(',').map((s) => s.trim())
    : [];

  const linter = options.language === 'java' ? 'checkstyle' : 'ktlint';

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
    packageName,
    packageDirectory,
    parsedProjects,
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

  if (options.skipStarterCode) {
    const fileExtension = options.language === 'java' ? 'java' : 'kt';
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/${options.packageDirectory}/GreetingService.${fileExtension}`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/${options.packageDirectory}/GreetingServiceTest.${fileExtension}`
      )
    );
  } else {
    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/main/${options.language}/.gitkeep`
      )
    );

    tree.delete(
      joinPathFragments(
        options.projectRoot,
        `/src/test/${options.language}/.gitkeep`
      )
    );
  }
}

export default async function (
  tree: Tree,
  options: NxQuarkusMavenLibGeneratorSchema
) {
  const normalizedOptions = normalizeOptions(tree, options);

  if (options.language === 'java') {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'library',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-micronaut-maven:build',
          outputs: [`${normalizedOptions.projectRoot}/target`],
        },
        lint: {
          executor: '@jnxplus/nx-micronaut-maven:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-micronaut-maven:test',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  } else {
    addProjectConfiguration(tree, normalizedOptions.projectName, {
      root: normalizedOptions.projectRoot,
      projectType: 'library',
      sourceRoot: `${normalizedOptions.projectRoot}/src`,
      targets: {
        build: {
          executor: '@jnxplus/nx-micronaut-maven:build',
          outputs: [`${normalizedOptions.projectRoot}/target`],
        },
        lint: {
          executor: '@jnxplus/nx-micronaut-maven:lint',
          options: {
            linter: `${normalizedOptions.linter}`,
          },
        },
        test: {
          executor: '@jnxplus/nx-micronaut-maven:test',
        },
        ktformat: {
          executor: '@jnxplus/nx-micronaut-maven:ktformat',
        },
      },
      tags: normalizedOptions.parsedTags,
    });
  }

  addFiles(tree, normalizedOptions);
  addProjectToParentPomXml(tree, normalizedOptions);
  addLibraryToProjects(tree, normalizedOptions);
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

function addLibraryToProjects(tree: Tree, options: NormalizedSchema) {
  for (const projectName of options.parsedProjects) {
    const projectRoot = readProjectConfiguration(tree, projectName).root;
    const filePath = path.join(projectRoot, `pom.xml`);
    const xmldoc = readXmlTree(tree, filePath);

    const dependency = new XmlDocument(`
		<dependency>
			<groupId>${options.groupId}</groupId>
			<artifactId>${options.projectName}</artifactId>
			<version>${options.projectVersion}</version>
		</dependency>
  `);

    let dependencies = xmldoc.childNamed('dependencies');

    if (dependencies === undefined) {
      xmldoc.children.push(
        new XmlDocument(`
      <dependencies>
      </dependencies>
    `)
      );
      dependencies = xmldoc.childNamed('dependencies');
    }

    if (dependencies === undefined) {
      throw new Error('Dependencies tag undefined');
    }

    dependencies.children.push(dependency);

    tree.write(filePath, xmlToString(xmldoc));
  }
}
