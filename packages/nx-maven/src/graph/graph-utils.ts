import { NxMavenPluginOptions } from '@jnxplus/common';
import { readXml } from '@jnxplus/xml';
import {
  NxJsonConfiguration,
  joinPathFragments,
  logger,
  normalizePath,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import * as flatCache from 'flat-cache';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';
import {
  getArtifactId,
  getExpressionValue,
  getGroupId,
  getLocalRepositoryPath,
  getVersion,
} from '../utils';

interface PropertyType {
  key: string;
  value: string;
}

export interface MavenProjectType {
  artifactId: string;
  groupId: string;
  version: string;
  isRootProject: boolean;
  isPomPackaging: boolean;
  projectRoot: string;
  projectAbsolutePath: string;
  dependencies: (string | undefined)[];
  parentProjectArtifactId?: string;
  aggregatorProjectArtifactId?: string;
  properties: PropertyType[];
}

export interface WorkspaceDataType {
  mavenRootDirAbsolutePath: string;
  targetDefaults: string[];
  localRepo: string;
  projects: MavenProjectType[];
}

const cacheId = 'workspace-data.json';
const cache = flatCache.load(
  cacheId,
  path.join(workspaceRoot, '.nx', 'cache', 'nx-maven'),
);
const key = 'workspace-data';

export function getWorkspaceData(opts: NxMavenPluginOptions | undefined) {
  const mavenRootDirectory = opts?.mavenRootDirectory
    ? opts.mavenRootDirectory
    : '';
  const mavenRootDirAbsolutePath = path.join(workspaceRoot, mavenRootDirectory);

  const projects: MavenProjectType[] = [];
  addProjects(mavenRootDirAbsolutePath, projects, '');

  //TODO calculate versions here

  const localRepositoryPath = getLocalRepositoryPath(
    opts,
    mavenRootDirAbsolutePath,
  );

  const data: WorkspaceDataType = {
    mavenRootDirAbsolutePath: mavenRootDirAbsolutePath,
    targetDefaults: getTargetDefaults(),
    localRepo: localRepositoryPath,
    projects: projects,
  };

  // Store data in cache for future use
  cache.setKey(key, data);
  cache.save();

  return data;
}

export function getCachedWorkspaceData() {
  return cache.getKey(key);
}

export function removeWorkspaceDataCache() {
  flatCache.clearCacheById(cacheId);
}

export function addProjects(
  mavenRootDirAbsolutePath: string,
  projects: MavenProjectType[],
  projectRelativePath: string,
  aggregatorProjectArtifactId?: string,
) {
  //projectAbsolutePath
  const projectAbsolutePath = path.join(
    mavenRootDirAbsolutePath,
    projectRelativePath,
  );
  const pomXmlPath = path.join(projectAbsolutePath, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);

  const artifactId = getArtifactId(pomXmlContent);

  const groupId = getGroupId(artifactId, pomXmlContent);

  const version = getVersion(artifactId, pomXmlContent);

  const isRootProject = !aggregatorProjectArtifactId;

  const isPomPackaging = isPomPackagingFunction(pomXmlContent);

  const projectRoot = getProjectRoot(projectAbsolutePath);

  const parentProjectArtifactId = getParentProjectName(pomXmlContent);

  const dependencies = getDependencyArtifactIds(pomXmlContent);

  const properties = getProperties(pomXmlContent);

  projects.push({
    artifactId: artifactId,
    groupId: groupId,
    version: version,
    isRootProject: isRootProject,
    isPomPackaging: isPomPackaging,
    projectRoot: projectRoot,
    projectAbsolutePath: projectAbsolutePath,
    dependencies: dependencies,
    parentProjectArtifactId: parentProjectArtifactId,
    aggregatorProjectArtifactId: aggregatorProjectArtifactId,
    properties: properties,
  });

  const modulesXmlElement = pomXmlContent.childNamed('modules');
  if (modulesXmlElement === undefined) {
    return;
  }

  const moduleXmlElementArray = modulesXmlElement.childrenNamed('module');
  if (moduleXmlElementArray.length === 0) {
    return;
  }

  for (const moduleXmlElement of moduleXmlElementArray) {
    const moduleRelativePath = joinPathFragments(
      projectRelativePath,
      moduleXmlElement.val.trim(),
    );
    addProjects(
      mavenRootDirAbsolutePath,
      projects,
      moduleRelativePath,
      artifactId,
    );
  }
}

function getProjectRoot(projectAbsolutePath: string) {
  let projectRoot = normalizePath(
    path.relative(workspaceRoot, projectAbsolutePath),
  );

  // projectRoot should not be an empty string
  if (!projectRoot) {
    projectRoot = '.';
  }

  return projectRoot;
}

function getParentProjectName(pomXmlContent: XmlDocument): string | undefined {
  const parentXmlElement = pomXmlContent.childNamed('parent');
  if (parentXmlElement === undefined) {
    return undefined;
  }

  const relativePath = parentXmlElement.childNamed('relativePath')?.val;

  if (!relativePath) {
    return undefined;
  }

  return parentXmlElement.childNamed('artifactId')?.val;
}

function getDependencyArtifactIds(pomXml: XmlDocument) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  return dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId')?.val;
    });
}

function isPomPackagingFunction(pomXmlContent: XmlDocument): boolean {
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}

export function getEffectiveVersion(
  project: MavenProjectType,
  workspaceData: WorkspaceDataType,
) {
  const cIFriendlyVersion = process.env['NX_MAVEN_CI_FRIENDLY_VERSION'];
  if (cIFriendlyVersion) {
    return cIFriendlyVersion;
  }

  let newVersion = project.version;

  //1 if version is constant return it
  if (isConstantVersion(newVersion)) {
    return newVersion;
  }

  //2 try to calculate version from project properties
  newVersion = getVersionFromProperties(newVersion, project.properties);
  if (isConstantVersion(newVersion)) {
    return newVersion;
  }

  //3 try to calculate version from parent project
  // we just calculate the part we didn't calculate in step 2
  newVersion = getVersionFromParentProject(
    newVersion,
    project.parentProjectArtifactId,
    workspaceData.projects,
  );
  if (isConstantVersion(newVersion)) {
    return newVersion;
  }

  //4 Can't calculate version, maybe contains something like ${project.parent.version}
  // call help:evaluate to get version and add warning because help:evaluate took a lot of time
  logger.warn(
    `Can't calculate version ${newVersion} of project ${project.artifactId} without using mvn help:evaluate that take a lot of time. Please Open an issue to address this case.`,
  );

  return getExpressionValue(
    'project.version',
    workspaceData.mavenRootDirAbsolutePath,
    project.artifactId,
  );
}

function getVersionFromParentProject(
  newVersion: string,
  parentProjectArtifactId: string | undefined,
  projects: MavenProjectType[],
) {
  if (!parentProjectArtifactId) {
    return newVersion;
  }

  const parentProject = getProject(projects, parentProjectArtifactId);
  newVersion = getVersionFromProperties(newVersion, parentProject.properties);

  if (isConstantVersion(newVersion)) {
    return newVersion;
  }

  return getVersionFromParentProject(
    newVersion,
    parentProject.parentProjectArtifactId,
    projects,
  );
}

function getTargetDefaults() {
  const targetDefaults = [];
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);
  if (nxJson.targetDefaults) {
    for (const [targetName, target] of Object.entries(nxJson.targetDefaults)) {
      if (
        (target.outputs ?? []).some(
          (element: string) => element === '{options.outputDirLocalRepo}',
        )
      ) {
        targetDefaults.push(targetName);
      }
    }
  }

  return targetDefaults;
}

export function getProject(projects: MavenProjectType[], artifactId: string) {
  const project = projects.find((project) => project.artifactId === artifactId);

  if (!project) {
    throw new Error(`Project ${artifactId} not found`);
  }

  return project;
}

function isConstantVersion(version: string): boolean {
  const index = version.indexOf('${');

  if (index >= 0) {
    return false;
  }

  return true;
}

function getProperties(pomXmlContent: XmlDocument) {
  //properties
  const propertiesXml = pomXmlContent.childNamed('properties');

  const properties: PropertyType[] = [];

  if (propertiesXml === undefined) {
    return properties;
  }

  propertiesXml.eachChild((propertyXml) => {
    properties.push({ key: propertyXml.name, value: propertyXml.val });
  });

  return properties;
}

function getVersionFromProperties(version: string, properties: PropertyType[]) {
  if (properties.length === 0) {
    return version;
  }

  const versionExpressions = extractExpressions(version);

  if (versionExpressions.length === 0) {
    throw new Error(`Version ${version} is a constant`);
  }

  const commonProperties = properties.filter((p) =>
    versionExpressions.includes(p.key),
  );

  if (commonProperties.length === 0) {
    return version;
  }

  let parsedVersion = version;
  for (const property of commonProperties) {
    parsedVersion = parsedVersion.replace(
      '${' + property.key + '}',
      property.value,
    );
  }

  if (version === parsedVersion) {
    throw new Error(
      `Code not working properly: version ${version} and parsedVersion ${parsedVersion} should not be the same`,
    );
  }

  return parsedVersion;
}

function extractExpressions(version: string): string[] {
  const expressionRegex = /\${([^${}]*)}/g;
  const expressions = [];
  let match;

  while ((match = expressionRegex.exec(version)) !== null) {
    expressions.push(match[1]);
  }

  const containsAnExpression = expressions.some((p) => p.indexOf('$') >= 0);
  if (containsAnExpression) {
    throw new Error(
      `Version ${version} not correctly parsed with regex ${expressionRegex}`,
    );
  }

  return expressions;
}
