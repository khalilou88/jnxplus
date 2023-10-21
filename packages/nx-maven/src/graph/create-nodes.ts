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
      projectName = getArtifactId(pomXmlContent);

      targets = {
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          options: {
            task: getTask(projectRoot),
          },
        },
      };
    }

    return {
      projects: {
        [projectName]: {
          root: projectRoot,
          targets: targets,
          tags: ['nx-maven'],
        },
      },
    };
  },
];

function getArtifactId(pomXmlContent: XmlDocument) {
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`ArtifactId not found in pom.xml`);
  }
  return artifactIdXml.val;
}

function getTask(projectRoot: string) {
  if (!projectRoot || projectRoot === '.') {
    return 'install -N';
  }

  return 'install';
}
