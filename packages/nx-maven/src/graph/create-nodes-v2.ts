import { NxMavenPluginOptions, TargetsType } from '@jnxplus/common';
import {
  CreateNodesContext,
  createNodesFromFiles,
  CreateNodesV2,
  ProjectConfiguration,
  readJsonFile,
} from '@nx/devkit';
import { existsSync } from 'fs';
import * as path from 'path';
import {
  getEffectiveVersion,
  getOutputDirLocalRepo,
  getTask,
  getWorkspaceData,
  MavenProjectType,
  WorkspaceDataType,
} from './graph-utils';

export const createNodesV2: CreateNodesV2<NxMavenPluginOptions> = [
  'nx.json',
  async (configFiles, options, context) => {
    return await createNodesFromFiles(
      (configFile, options, context) =>
        createNodesInternal(configFile, options, context),
      configFiles,
      options,
      context,
    );
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createNodesInternal(
  configFilePath: string,
  options: NxMavenPluginOptions | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: CreateNodesContext,
) {
  const workspaceData: WorkspaceDataType = getWorkspaceData(options);
  const mavenProjects: MavenProjectType[] = workspaceData.projects;

  const projects: Record<string, ProjectConfiguration> = {};

  for (const project of mavenProjects) {
    if (project.skipProject) {
      continue;
    }

    let projectName;
    let targets: TargetsType = {};

    const projectJsonPath = path.join(
      project.projectAbsolutePath,
      'project.json',
    );

    if (existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;

      if (projectName !== project.artifactId) {
        throw new Error(
          `ProjectName ${projectName} and artifactId ${project.artifactId} should be the same`,
        );
      }

      targets = projectJson.targets;
      for (const [targetName] of Object.entries(targets ?? {})) {
        if (
          workspaceData.targetDefaults.includes(targetName) ||
          (targets[targetName].outputs ?? []).some(
            (element: string) => element === '{options.outputDirLocalRepo}',
          )
        ) {
          const effectiveVersion = getEffectiveVersion(project, workspaceData);

          const outputDirLocalRepo = getOutputDirLocalRepo(
            workspaceData.localRepo,
            project.groupId,
            project.artifactId,
            effectiveVersion,
          );

          if (hasChangedSnapshotDependency(project)) {
            targets[targetName] = {
              ...targets[targetName],
              inputs: [{ runtime: 'date +%s' }],
            };
          }

          targets[targetName].options = {
            ...targets[targetName].options,
            outputDirLocalRepo: outputDirLocalRepo,
          };
        }
      }
    } else {
      const effectiveVersion = getEffectiveVersion(project, workspaceData);

      const outputDirLocalRepo = getOutputDirLocalRepo(
        workspaceData.localRepo,
        project.groupId,
        project.artifactId,
        effectiveVersion,
      );

      projectName = project.artifactId;
      let outputs;
      if (project.isPomPackaging) {
        outputs = ['{options.outputDirLocalRepo}'];
      } else {
        outputs = ['{projectRoot}/target', '{options.outputDirLocalRepo}'];
      }

      const buildTargetName = options?.buildTargetName
        ? options.buildTargetName
        : 'build';

      targets = {
        [buildTargetName]: {
          executor: '@jnxplus/nx-maven:run-task',
          outputs: outputs,
          options: {
            task: getTask(project.isRootProject),
            outputDirLocalRepo: outputDirLocalRepo,
          },
        },
      };

      if (hasChangedSnapshotDependency(project)) {
        targets[buildTargetName] = {
          ...targets[buildTargetName],
          inputs: [{ runtime: 'date +%s' }],
        };
      }
    }

    projects[project.projectRoot] = {
      root: project.projectRoot,
      name: projectName,
      targets: targets,
      tags: ['nx-maven'],
    };
  }

  return { projects: projects };
}
