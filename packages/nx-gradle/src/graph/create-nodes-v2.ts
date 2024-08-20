import { NxGradlePluginOptions } from '@jnxplus/common';
import {
  CreateNodesContext,
  createNodesFromFiles,
  CreateNodesV2,
  ProjectConfiguration,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getExecutable } from '../utils';
import {
  getGradleProjects,
  getProjectRoot,
  outputDirectory,
  outputFile,
} from './graph-utils';

export const createNodesV2: CreateNodesV2<NxGradlePluginOptions> = [
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
  options: NxGradlePluginOptions | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: CreateNodesContext,
) {
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }

  const command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

  const gradleRootDirectory = options?.gradleRootDirectory
    ? options.gradleRootDirectory
    : '';

  execSync(command, {
    cwd: path.join(workspaceRoot, gradleRootDirectory),
    env: process.env,
    stdio: 'pipe',
    encoding: 'utf-8',
    windowsHide: true,
  });

  const gradleProjects = getGradleProjects();

  const projects: Record<string, ProjectConfiguration> = {};

  for (const project of gradleProjects) {
    const projectRoot = getProjectRoot(gradleRootDirectory, project);

    projects[projectRoot] = {
      root: projectRoot,
      name: project.name,
      tags: ['nx-gradle'],
    };
  }

  return { projects: projects };
}
