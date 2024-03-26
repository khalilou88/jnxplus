import { NxGradlePluginOptions } from '@jnxplus/common';
import { CreateNodes, ProjectConfiguration, workspaceRoot } from '@nx/devkit';
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

export const createNodes: CreateNodes<NxGradlePluginOptions> = [
  'nx.json',
  (_, opts) => {
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }

    const command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

    const gradleRootDirectory = opts?.gradleRootDirectory
      ? opts.gradleRootDirectory
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
  },
];
