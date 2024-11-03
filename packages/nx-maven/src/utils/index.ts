import { NxMavenPluginOptions } from '@jnxplus/common';
import { readXmlTree, xmlToString } from '@jnxplus/xml';
import {
  NxJsonConfiguration,
  PluginConfiguration,
  Tree,
  joinPathFragments,
  logger,
  readJsonFile,
  readProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';

export function getExecutable() {
  let executable = '';

  const mavenRootDirectory = getMavenRootDirectory();

  const mavenCli = process.env['NX_MAVEN_CLI'];
  if (mavenCli) {
    if (mavenCli !== 'mvnw' && mavenCli !== 'mvn' && mavenCli !== 'mvnd') {
      throw new Error(
        `Wrong value for NX_MAVEN_CLI. Please choose between mvnw, mvn and mvnd.`,
      );
    }

    if (mavenCli === 'mvnw') {
      executable = process.platform.startsWith('win') ? 'mvnw.cmd' : './mvnw';
    } else {
      executable = mavenCli;
    }
  } else if (process.env['NX_SKIP_MAVEN_WRAPPER'] === 'true') {
    //TODO NX_SKIP_MAVEN_WRAPPER is deprecated, please use NX_MAVEN_CLI instead
    logger.warn(
      'NX_SKIP_MAVEN_WRAPPER is deprecated, please use NX_MAVEN_CLI instead',
    );
    executable = 'mvn';
  } else {
    const isWrapperExists = isWrapperExistsFunction(mavenRootDirectory);

    if (isWrapperExists) {
      executable = process.platform.startsWith('win') ? 'mvnw.cmd' : './mvnw';
    } else {
      executable = 'mvn';
    }
  }

  if (process.env['NX_MAVEN_CLI_OPTS']) {
    executable += ` ${process.env['NX_MAVEN_CLI_OPTS']}`;
  }

  const localRepoRelativePath = getLocalRepoRelativePath();
  if (localRepoRelativePath) {
    const mavenRepoLocal = path.join(
      workspaceRoot,
      mavenRootDirectory,
      localRepoRelativePath,
    );
    executable += ` -Dmaven.repo.local=${mavenRepoLocal}`;
  }

  return executable;
}

function isWrapperExistsFunction(mavenRootDirectory: string) {
  const mvnwPath = path.join(workspaceRoot, mavenRootDirectory, 'mvnw');
  return fs.existsSync(mvnwPath);
}

export function getMavenRootDirectory(): string {
  const plugin = getPlugin();

  if (typeof plugin === 'string') {
    return '';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'mavenRootDirectory' in options &&
    typeof options.mavenRootDirectory === 'string'
  ) {
    return options.mavenRootDirectory;
  }

  return '';
}

export function getPlugin(): PluginConfiguration | undefined {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const plugin = (nxJson?.plugins ?? []).find((p) =>
    typeof p === 'string'
      ? p === '@jnxplus/nx-maven'
      : p.plugin === '@jnxplus/nx-maven',
  );

  return plugin;
}

function getProjectRootFromTree(
  tree: Tree,
  mavenRootDirectory: string,
  projectName: string,
): string {
  let projectRoot = '';

  try {
    projectRoot = readProjectConfiguration(tree, projectName).root;
    return projectRoot;
  } catch (err) {
    const isVerbose = process.env['NX_VERBOSE_LOGGING'] === 'true';
    if (isVerbose) {
      logger.warn(err);
    }

    const mavenRootDirAbsolutePath = path.join(
      workspaceRoot,
      mavenRootDirectory,
    );

    const projectBasedir = getExpressionValue(
      'project.basedir',
      mavenRootDirAbsolutePath,
      projectName,
    );

    projectRoot = path.relative(workspaceRoot, projectBasedir);

    return projectRoot;
  }
}

export function getExpressionValue(
  expression: string,
  mavenRootDirAbsolutePath: string,
  projectName?: string,
) {
  let command = `${getExecutable()} help:evaluate -Dexpression=${expression} -q -DforceStdout`;

  if (projectName) {
    command += ` -pl ${projectName}`;
  }

  return execSync(command, {
    cwd: mavenRootDirAbsolutePath,
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  })
    .toString()
    .trim();
}

export function addProjectToAggregator(
  tree: Tree,
  options: {
    projectRoot: string;
    aggregatorProjectRoot: string;
    mavenRootDirectory: string;
  },
) {
  const parentProjectPomPath = path.join(
    options.aggregatorProjectRoot,
    'pom.xml',
  );
  const xmlDoc = readXmlTree(tree, parentProjectPomPath);

  const aggregatorProjectAbsolutPath = path.join(
    workspaceRoot,
    options.aggregatorProjectRoot,
  );
  const projectAbsolutePath = path.join(workspaceRoot, options.projectRoot);

  const moduleRelativePath = path
    .relative(aggregatorProjectAbsolutPath, projectAbsolutePath)
    .replace(new RegExp(/\\/, 'g'), '/');

  const fragment = new XmlDocument(`<module>${moduleRelativePath}</module>`);

  let modules = xmlDoc.childNamed('modules');

  if (modules === undefined) {
    xmlDoc.children.push(
      new XmlDocument(`
    <modules>
    </modules>
  `),
    );
    modules = xmlDoc.childNamed('modules');
  }

  if (modules === undefined) {
    throw new Error('Modules tag undefined');
  }

  modules.children.push(fragment);

  tree.write(parentProjectPomPath, xmlToString(xmlDoc));
}

export function addLibraryToProjects(
  tree: Tree,
  options: {
    parsedProjects: string[];
    groupId: string;
    projectName: string;
    projectVersion: string;
    mavenRootDirectory: string;
  },
) {
  logger.info(
    `Adding lib ${options.projectName} to projects: ${JSON.stringify(options.parsedProjects)}`,
  );

  for (const projectName of options.parsedProjects) {
    const projectRoot = getProjectRootFromTree(
      tree,
      options.mavenRootDirectory,
      projectName,
    );
    const filePath = path.join(projectRoot, 'pom.xml');
    const xmlDoc = readXmlTree(tree, filePath);

    const dependency = new XmlDocument(`
		<dependency>
			<groupId>${options.groupId}</groupId>
			<artifactId>${options.projectName}</artifactId>
			<version>${options.projectVersion}</version>
		</dependency>
  `);

    let dependencies = xmlDoc.childNamed('dependencies');

    if (dependencies === undefined) {
      xmlDoc.children.push(
        new XmlDocument(`
      <dependencies>
      </dependencies>
    `),
      );
      dependencies = xmlDoc.childNamed('dependencies');
    }

    if (dependencies === undefined) {
      throw new Error('Dependencies tag undefined');
    }

    dependencies.children.push(dependency);

    tree.write(filePath, xmlToString(xmlDoc));
  }
}

function getLocalRepoRelativePath(): string {
  const plugin = getPlugin();

  if (typeof plugin === 'string') {
    return '';
  }

  const options = plugin?.options;

  if (
    typeof options === 'object' &&
    options &&
    'localRepoRelativePath' in options &&
    typeof options.localRepoRelativePath === 'string'
  ) {
    return options.localRepoRelativePath;
  }

  return '';
}

export function getLocalRepositoryPath(
  opts: NxMavenPluginOptions | undefined,
  mavenRootDirAbsolutePath: string,
) {
  let localRepositoryPath;
  const localRepoRelativePath = opts?.localRepoRelativePath
    ? opts.localRepoRelativePath
    : '';
  if (localRepoRelativePath) {
    const mavenRootDirectory = opts?.mavenRootDirectory
      ? opts.mavenRootDirectory
      : '';
    localRepositoryPath = joinPathFragments(
      mavenRootDirectory,
      localRepoRelativePath,
    );
  } else {
    localRepositoryPath = getExpressionValue(
      'settings.localRepository',
      mavenRootDirAbsolutePath,
    );
  }

  return localRepositoryPath;
}

export function getArtifactId(pomXmlContent: XmlDocument) {
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`ArtifactId not found in pom.xml`);
  }
  return artifactIdXml.val;
}

export function getGroupId(artifactId: string, pomXmlContent: XmlDocument) {
  let groupId;
  const groupIdXml = pomXmlContent.childNamed('groupId');
  if (groupIdXml === undefined) {
    groupId = getParentGroupId(pomXmlContent);
  } else {
    groupId = groupIdXml.val;
  }

  if (!groupId) {
    throw new Error(`GroupId is not set for project ${artifactId}`);
  }

  return groupId;
}

function getParentGroupId(pomXmlContent: XmlDocument): string | undefined {
  const parentXml = pomXmlContent.childNamed('parent');

  if (parentXml === undefined) {
    return undefined;
  }

  const groupIdXml = parentXml.childNamed('groupId');

  if (groupIdXml === undefined) {
    return undefined;
  }

  return groupIdXml?.val;
}

export function getVersion(artifactId: string, pomXmlContent: XmlDocument) {
  let version;
  const versionXml = pomXmlContent.childNamed('version');
  if (versionXml === undefined) {
    version = getParentVersion(pomXmlContent);
  } else {
    version = versionXml.val;
  }

  if (!version) {
    throw new Error(`Version is not set for project ${artifactId}`);
  }

  return version;
}

function getParentVersion(pomXmlContent: XmlDocument): string | undefined {
  const parentXml = pomXmlContent.childNamed('parent');

  if (parentXml === undefined) {
    return undefined;
  }

  const versionXml = parentXml.childNamed('version');

  if (versionXml === undefined) {
    return undefined;
  }

  return versionXml?.val;
}

export function getParentProjectValues(
  tree: Tree,
  mavenRootDirectory: string,
  projectRoot: string,
  parentProject: string,
) {
  if (!parentProject) {
    return ['', '', '', ''];
  }

  const parentProjectRoot = getProjectRootFromTree(
    tree,
    mavenRootDirectory,
    parentProject,
  );

  const parentProjectPomPath = path.join(parentProjectRoot, 'pom.xml');

  const pomXmlContent = readXmlTree(tree, parentProjectPomPath);

  const relativePath = joinPathFragments(
    path.relative(projectRoot, parentProjectRoot),
    'pom.xml',
  );

  const parentProjectName = getArtifactId(pomXmlContent);
  const parentGroupId = getGroupId(parentProjectName, pomXmlContent);
  const parentProjectVersion = getVersion(parentProjectName, pomXmlContent);

  return [relativePath, parentProjectName, parentGroupId, parentProjectVersion];
}

export function getSkipAggregatorProjectLinkingOption(
  plugin: PluginConfiguration | undefined,
): boolean {
  if (typeof plugin === 'string') {
    return false;
  }

  const options = plugin?.options;

  if (typeof options === 'object' && options && 'graphOptions' in options) {
    const graphOptions = options?.graphOptions;

    if (
      typeof graphOptions === 'object' &&
      graphOptions &&
      'skipAggregatorProjectLinking' in graphOptions &&
      typeof graphOptions.skipAggregatorProjectLinking === 'boolean'
    ) {
      return graphOptions.skipAggregatorProjectLinking;
    }
  }

  return false;
}

export function getAggregatorProjectRoot(
  tree: Tree,
  aggregatorProject: string | undefined,
  mavenRootDirectory: string,
) {
  if (!aggregatorProject) {
    return mavenRootDirectory;
  }

  return getProjectRootFromTree(tree, mavenRootDirectory, aggregatorProject);
}
