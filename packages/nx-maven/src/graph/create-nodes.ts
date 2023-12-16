import { readXml } from '@jnxplus/xml';
import { CreateNodes, readJsonFile, workspaceRoot } from '@nx/devkit';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { XmlDocument } from 'xmldoc';

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
    } else {
      const pomXmlContent = readXml(pomXmlFilePath);
      const groupId = getGroupId(pomXmlContent);
      projectName = getArtifactId(pomXmlContent);
      const projectVersion = getVersion(pomXmlContent);
      const localRepositoryLocation = getLocalRepositoryLocation();

      targets = {
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          options: {
            outputs: [
              `{projectRoot}/target`,
              getOutput(
                localRepositoryLocation,
                groupId,
                projectName,
                projectVersion,
              ),
            ],
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

function getOutput(
  localRepositoryLocation: string,
  groupId: string,
  projectName: string,
  projectVersion: string,
) {
  return `${localRepositoryLocation}/.m2/repository/${groupId.replace(
    new RegExp(/\./, 'g'),
    '/',
  )}/${projectName}/${projectVersion}`;
}

function getTask(projectRoot: string) {
  if (!projectRoot || projectRoot === '.') {
    return 'install -N';
  }

  return 'install';
}

function getLocalRepositoryLocation() {
  const location = '{workspaceRoot}';
  return location;
}
