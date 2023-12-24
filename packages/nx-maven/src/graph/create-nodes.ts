import { readXml } from '@jnxplus/xml';
import {
  CreateNodes,
  TargetConfiguration,
  joinPathFragments,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as cache from 'memory-cache';
import * as path from 'path';
import { XmlDocument } from 'xmldoc';
import { getExecutable, getMavenRootDirectory } from '../utils';

export const createNodes: CreateNodes = [
  '**/pom.xml',
  (pomXmlFilePath: string) => {
    let projectName;
    const projectRoot = path.dirname(pomXmlFilePath);
    let targets: {
      [targetName: string]: TargetConfiguration;
    } = {};

    const projectAbsolutePath = path.join(workspaceRoot, projectRoot);
    const projectJsonPath = path.join(projectAbsolutePath, 'project.json');

    const mavenRootDirectory = getMavenRootDirectory();
    const mavenRootDirAbsolutePath = path.join(
      workspaceRoot,
      mavenRootDirectory,
    );

    if (existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;
      targets = projectJson.targets;
      for (const [targetName] of Object.entries(targets ?? {})) {
        if (
          (targets[targetName].outputs ?? []).some(
            (element: string) => element === '{options.outputDirLocalRepo}',
          )
        ) {
          const pomXmlContent = readXml(pomXmlFilePath);
          const artifactId = getArtifactId(pomXmlContent);
          const groupId = getGroupId(artifactId, pomXmlContent);
          const projectVersion = getVersion(
            artifactId,
            pomXmlContent,
            mavenRootDirAbsolutePath,
            projectAbsolutePath,
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
      const pomXmlContent = readXml(pomXmlFilePath);
      const artifactId = getArtifactId(pomXmlContent);
      const groupId = getGroupId(artifactId, pomXmlContent);
      const projectVersion = getVersion(
        artifactId,
        pomXmlContent,
        mavenRootDirAbsolutePath,
        projectAbsolutePath,
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

function getLocalRepositoryPath(mavenRootDirAbsolutePath: string) {
  const key = 'localRepositoryPath';
  const cachedLocalRepository = cache.get(key);
  if (cachedLocalRepository) {
    return cachedLocalRepository;
  }

  const localRepository = execSync(
    `${getExecutable()} help:evaluate -Dexpression=settings.localRepository -q -DforceStdout`,
    {
      cwd: mavenRootDirAbsolutePath,
    },
  )
    .toString()
    .trim();

  // Store data in cache for future use
  cache.put(key, localRepository, 60000); // Cache for 60 seconds

  return localRepository;
}

function isPomPackaging(pomXmlContent: XmlDocument): boolean {
  const packagingXml = pomXmlContent.childNamed('packaging');

  if (packagingXml === undefined) {
    return false;
  }

  return packagingXml.val === 'pom';
}

function getVersion(
  artifactId: string,
  pomXmlContent: XmlDocument,
  mavenRootDirAbsolutePath: string,
  projectAbsolutePath: string,
) {
  let version;
  const versionXml = pomXmlContent.childNamed('version');
  if (versionXml === undefined) {
    version = getParentVersion(artifactId, pomXmlContent);
  } else {
    version = versionXml.val;
  }

  if (version.indexOf('${') >= 0) {
    version = getEffectiveVersion(
      mavenRootDirAbsolutePath,
      projectAbsolutePath,
    );
  }

  return version;
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

function getEffectiveVersion(
  mavenRootDirAbsolutePath: string,
  projectAbsolutePath: string,
): string {
  const relativePath = path.relative(
    mavenRootDirAbsolutePath,
    projectAbsolutePath,
  );
  const pomXmlRelativePath = joinPathFragments(relativePath, 'pom.xml');
  const version = execSync(
    `${getExecutable()} -f ${pomXmlRelativePath} help:evaluate -Dexpression=project.version -q -DforceStdout`,
    {
      cwd: mavenRootDirAbsolutePath,
    },
  )
    .toString()
    .trim();

  return version;
}
