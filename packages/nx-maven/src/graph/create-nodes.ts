import { readXml } from '@jnxplus/xml';
import { CreateNodes, readJsonFile, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as cache from 'memory-cache';
import { dirname, join } from 'path';
import { XmlDocument } from 'xmldoc';
import { getExecutable, getMavenRootDirectory } from '../utils';

export const createNodes: CreateNodes = [
  '**/pom.xml',
  (pomXmlFilePath: string) => {
    let projectName;
    const projectRoot = dirname(pomXmlFilePath);
    let targets = {};

    const projectJsonPath = join(workspaceRoot, projectRoot, 'project.json');

    if (existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;
      for (const [targetName] of Object.entries(projectJson.targets ?? {})) {
        if (
          (projectJson.targets[targetName].outputs ?? []).some(
            (element: string) => element === '{options.outputDirLocalRepo}',
          )
        ) {
          const pomXmlContent = readXml(pomXmlFilePath);
          const artifactId = getArtifactId(pomXmlContent);
          const groupId = getGroupId(artifactId, pomXmlContent);
          const projectVersion = getVersion(artifactId, pomXmlContent);
          const localRepositoryLocation = getLocalRepositoryLocation();

          const outputDirLocalRepo = getOutputDirLocalRepo(
            localRepositoryLocation,
            groupId,
            artifactId,
            projectVersion,
          );

          const target = {
            targetName: {
              options: {
                outputDirLocalRepo: outputDirLocalRepo,
              },
            },
          };

          targets = {
            target,
            ...targets,
          };
        }
      }
    } else {
      const pomXmlContent = readXml(pomXmlFilePath);
      const artifactId = getArtifactId(pomXmlContent);
      const groupId = getGroupId(artifactId, pomXmlContent);
      const projectVersion = getVersion(artifactId, pomXmlContent);
      const localRepositoryLocation = getLocalRepositoryLocation();

      const outputDirLocalRepo = getOutputDirLocalRepo(
        localRepositoryLocation,
        groupId,
        artifactId,
        projectVersion,
      );

      projectName = artifactId;
      let outputs;
      if (isPomPackaging(pomXmlContent)) {
        outputs = ['{options.outputDirLocalRepo}'];
      } else {
        outputs = ['{projectRoot}/target', '{options.outputDirLocalRepo}'];
      }
      targets = {
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          outputs: outputs,
          options: {
            outputDirLocalRepo: outputDirLocalRepo,
            task: getTask(projectRoot),
          },
        },
      };
    }

    return {
      projects: {
        [projectRoot]: {
          name: projectName,
          root: projectRoot,
          targets: targets,
          tags: ['nx-maven'],
        },
      },
    };
  },
];

function getParentGroupId(
  artifactId: string,
  pomXmlContent: XmlDocument,
): string {
  const parentXml = pomXmlContent.childNamed('parent');

  if (parentXml === undefined) {
    throw new Error(`Parent tag not found for project ${artifactId}`);
  }

  const groupIdXml = parentXml.childNamed('groupId');

  if (groupIdXml === undefined) {
    throw new Error(`ParentGroupId not found for project ${artifactId}`);
  }

  return groupIdXml?.val;
}

function getParentVersion(
  artifactId: string,
  pomXmlContent: XmlDocument,
): string {
  const parentXml = pomXmlContent.childNamed('parent');

  if (parentXml === undefined) {
    throw new Error(`Parent tag not found for project ${artifactId}`);
  }

  const versionXml = parentXml.childNamed('version');

  if (versionXml === undefined) {
    throw new Error(`ParentVersion not found for project ${artifactId}`);
  }

  return versionXml?.val;
}

function getGroupId(artifactId: string, pomXmlContent: XmlDocument) {
  const groupIdXml = pomXmlContent.childNamed('groupId');
  if (groupIdXml === undefined) {
    return getParentGroupId(artifactId, pomXmlContent);
  }
  return groupIdXml.val;
}

function getArtifactId(pomXmlContent: XmlDocument) {
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`ArtifactId not found in pom.xml`);
  }
  return artifactIdXml.val;
}

function getVersion(artifactId: string, pomXmlContent: XmlDocument) {
  const versionXml = pomXmlContent.childNamed('version');
  if (versionXml === undefined) {
    return getParentVersion(artifactId, pomXmlContent);
  }
  return versionXml.val;
}

function getOutputDirLocalRepo(
  localRepositoryLocation: string,
  groupId: string,
  artifactId: string,
  projectVersion: string,
) {
  return join(
    localRepositoryLocation,
    `${groupId.replace(
      new RegExp(/\./, 'g'),
      '/',
    )}/${artifactId}/${projectVersion}`,
  );
}

function getTask(projectRoot: string) {
  if (!projectRoot || projectRoot === '.') {
    return 'install -N';
  }

  return 'install';
}

function getLocalRepositoryLocation() {
  const key = 'localRepositoryLocation';
  const cachedData = cache.get(key);
  if (cachedData) {
    return cachedData;
  }

  const regexp = /<localRepository>(.+?)<\/localRepository>/g;
  const command = `${getExecutable()} help:effective-settings`;

  const data = runCommandAndExtractRegExp(command, regexp);

  // Store data in cache for future use
  cache.put(key, data, 60000); // Cache for 60 seconds

  return data;
}

function isPomPackaging(pomXmlContent: XmlDocument): boolean {
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}

function runCommandAndExtractRegExp(command: string, regexp: RegExp) {
  const mavenRootDirectory = getMavenRootDirectory();
  const objStr = execSync(command, {
    cwd: join(workspaceRoot, mavenRootDirectory),
  }).toString();

  const matches = (objStr.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}
