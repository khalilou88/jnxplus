import { TargetsType } from '@jnxplus/common';
import { readXml } from '@jnxplus/xml';
import { CreateNodes, readJsonFile, workspaceRoot } from '@nx/devkit';
import { existsSync } from 'fs';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';
import {
  getArtifactId,
  getEffectiveVersion,
  getGroupId,
  getLocalRepositoryPath,
  getMavenRootDirectory,
} from '../utils';

export const createNodes: CreateNodes = [
  '**/pom.xml',
  (pomXmlFilePath: string) => {
    let projectName;
    const projectRoot = path.dirname(pomXmlFilePath);
    let targets: TargetsType = {};

    const projectAbsolutePath = path.join(workspaceRoot, projectRoot);
    const projectJsonPath = path.join(projectAbsolutePath, 'project.json');

    const mavenRootDirectory = getMavenRootDirectory();
    const mavenRootDirAbsolutePath = path.join(
      workspaceRoot,
      mavenRootDirectory,
    );

    const pomXmlContent = readXml(pomXmlFilePath);
    const artifactId = getArtifactId(pomXmlContent);

    if (existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;

      if (projectName !== artifactId) {
        throw new Error(
          `ProjectName ${projectName} and artifactId ${artifactId} should be the same`,
        );
      }

      targets = projectJson.targets;
      for (const [targetName] of Object.entries(targets ?? {})) {
        if (
          (targets[targetName].outputs ?? []).some(
            (element: string) => element === '{options.outputDirLocalRepo}',
          )
        ) {
          const groupId = getGroupId(artifactId, pomXmlContent);
          const projectVersion = getEffectiveVersion(
            artifactId,
            pomXmlContent,
            mavenRootDirAbsolutePath,
          );
          const localRepositoryPath = getLocalRepositoryPath(
            mavenRootDirAbsolutePath,
          );

          const outputDirLocalRepo = getOutputDirLocalRepo(
            localRepositoryPath,
            groupId,
            artifactId,
            projectVersion,
          );

          targets[targetName].options = {
            ...targets[targetName].options,
            outputDirLocalRepo: outputDirLocalRepo,
          };
        }
      }
    } else {
      const groupId = getGroupId(artifactId, pomXmlContent);
      const projectVersion = getEffectiveVersion(
        artifactId,
        pomXmlContent,
        mavenRootDirAbsolutePath,
      );
      const localRepositoryPath = getLocalRepositoryPath(
        mavenRootDirAbsolutePath,
      );

      const outputDirLocalRepo = getOutputDirLocalRepo(
        localRepositoryPath,
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
            task: getTask(projectRoot),
            outputDirLocalRepo: outputDirLocalRepo,
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

function getOutputDirLocalRepo(
  localRepositoryPath: string,
  groupId: string,
  artifactId: string,
  projectVersion: string,
) {
  return path.join(
    localRepositoryPath,
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

function isPomPackaging(pomXmlContent: XmlDocument): boolean {
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}
