import { getProjectGraphNodeType } from '@jnxplus/common';
import { getTask, readXml } from '@jnxplus/maven';
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

    const projectGraphNodeType = getProjectGraphNodeType(projectRoot);

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
            task: getTask(projectRoot, projectGraphNodeType),
          },
        },
      };
    }

    return {
      projects: {
        [projectName]: {
          root: projectRoot,
          type: projectGraphNodeType,
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
