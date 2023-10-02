import { readXml } from '@jnxplus/maven';
import { CreateNodes, CreateNodesContext } from '@nx/devkit';
import { dirname } from 'path';
import { XmlDocument } from 'xmldoc';

export const createNodes: CreateNodes = [
  '**/pom.xml',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (pomXmlFilePath: string, context: CreateNodesContext) => {
    const pomXmlContent = readXml(pomXmlFilePath);
    const projectRoot = dirname(pomXmlFilePath);
    const projectName = getName(pomXmlContent);

    return {
      projects: {
        [projectName]: {
          root: projectRoot,
          tags: ['nx-maven'],
        },
      },
    };
  },
];

function getName(pomXmlContent: XmlDocument) {
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`artifactId not found in pom.xml`);
  }
  return artifactIdXml.val;
}
