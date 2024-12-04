import { NxMavenPluginOptions, TargetsType } from '@jnxplus/common';
import { CreateNodes, ProjectConfiguration, readJsonFile } from '@nx/devkit';
import { existsSync } from 'fs';
import * as path from 'path';
import {
  MavenProjectType,
  WorkspaceDataType,
  getEffectiveVersion,
  getOutputDirLocalRepo,
  getTask,
  getWorkspaceData,
  validateTargetInputs,
} from './graph-utils';

export const createNodes: CreateNodes<NxMavenPluginOptions> = [
  'nx.json',
  (_, opts) => {
    const workspaceData: WorkspaceDataType = getWorkspaceData(opts);
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
          const target = targets[targetName];
          validateTargetInputs(targetName, 'project.json', target.inputs);

          if (
            !target.options['outputDirLocalRepo'] &&
            (workspaceData.targetDefaults.includes(targetName) ||
              (target.outputs ?? []).some(
                (element: string) => element === '{options.outputDirLocalRepo}',
              ))
          ) {
            const effectiveVersion = getEffectiveVersion(
              project,
              workspaceData,
            );

            const outputDirLocalRepo = getOutputDirLocalRepo(
              workspaceData.localRepo,
              project.groupId,
              project.artifactId,
              effectiveVersion,
            );

            target.options = {
              ...target.options,
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

        const buildTargetName = opts?.buildTargetName
          ? opts.buildTargetName
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
      }

      projects[project.projectRoot] = {
        root: project.projectRoot,
        name: projectName,
        targets: targets,
        tags: ['nx-maven'],
      };
    }

    return { projects: projects };
  },
];
