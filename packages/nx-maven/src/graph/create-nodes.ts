import { readXml } from '@jnxplus/xml';
import {
  CreateNodes,
  TargetConfiguration,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { XmlDocument } from 'xmldoc';
import { getExecutable, getMavenRootDirectory } from '../utils';

export const createNodes: CreateNodes = [
  '**/pom.xml',
  (pomXmlFilePath: string) => {
    let projectName;
    const projectRoot = dirname(pomXmlFilePath);
    let targets: {
      [targetName: string]: TargetConfiguration;
    } = {};

    const pomXmlContent = readXml(pomXmlFilePath);
    const groupId = getGroupId(pomXmlContent);
    const artifactId = getArtifactId(pomXmlContent);
    const projectVersion = getVersion(pomXmlContent);
    const localRepositoryLocation = getLocalRepositoryLocation();

    const output = getOutput(
      localRepositoryLocation,
      groupId,
      artifactId,
      projectVersion,
    );

    const projectJsonPath = join(workspaceRoot, projectRoot, 'project.json');

    if (existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;
      targets = projectJson.targets;
      const build = targets['build'];
      if (build.outputs) {
        build.outputs.push(output);
      } else {
        build.outputs = [output];
      }
    } else {
      projectName = artifactId;
      targets = {
        build: {
          executor: '@jnxplus/nx-maven:run-task',
          outputs: [`{projectRoot}/target`, output],
          options: {
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
  return join(
    localRepositoryLocation,
    `${groupId.replace(
      new RegExp(/\./, 'g'),
      '/',
    )}/${projectName}/${projectVersion}`,
  );
}

function getTask(projectRoot: string) {
  if (!projectRoot || projectRoot === '.') {
    return 'install -N';
  }

  return 'install';
}

function getLocalRepositoryLocation() {
  const command = `${getExecutable()} help:effective-settings`;

  const mavenRootDirectory = getMavenRootDirectory();
  const objStr = execSync(command, {
    cwd: join(workspaceRoot, mavenRootDirectory),
  }).toString();

  const regexp = /<localRepository>(.+?)<\/localRepository>/g;
  const matches = (objStr.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1'),
  );
  return matches[0];
}
