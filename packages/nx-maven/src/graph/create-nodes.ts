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
      for (const targetName in projectJson.targets) {
        if (
          (projectJson.targets[targetName].outputs ?? []).some(
            (element: string) => element === '{options.outputDirLocalRepo}',
          )
        ) {
          const pomXmlContent = readXml(pomXmlFilePath);
          const groupId = getGroupId(pomXmlContent);
          const artifactId = getArtifactId(pomXmlContent);
          const projectVersion = getVersion(pomXmlContent);
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
      const groupId = getGroupId(pomXmlContent);
      const artifactId = getArtifactId(pomXmlContent);
      const projectVersion = getVersion(pomXmlContent);
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

function getGroupId(pomXmlContent: XmlDocument) {
  const groupIdXml = pomXmlContent.childNamed('groupId');
  if (groupIdXml === undefined) {
    throw new Error(`GroupId not found in pom.xml`);
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

function getVersion(pomXmlContent: XmlDocument) {
  const versionXml = pomXmlContent.childNamed('version');
  if (versionXml === undefined) {
    throw new Error(`Version not found in pom.xml`);
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

  const command = `${getExecutable()} help:effective-settings`;

  const mavenRootDirectory = getMavenRootDirectory();
  const objStr = execSync(command, {
    cwd: join(workspaceRoot, mavenRootDirectory),
  }).toString();

  const regexp = /<localRepository>(.+?)<\/localRepository>/g;
  const matches = (objStr.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  const data = matches[0];

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
