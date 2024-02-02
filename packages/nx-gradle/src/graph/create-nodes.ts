import { jnxplusGradlePluginVersion } from '@jnxplus/common';
import { CreateNodes, ProjectConfiguration, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getExecutable, getGradleRootDirectory } from '../utils';
import {
  GradleProjectType,
  getProjectRoot,
  isGradlePluginOutdated,
  outputFile,
} from './graph-utils';

export const createNodes: CreateNodes = [
  'nx.json',
  () => {
    const command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

    const gradleRootDirectory = getGradleRootDirectory();

    try {
      execSync(command, {
        cwd: path.join(workspaceRoot, gradleRootDirectory),
        env: process.env,
        stdio: 'pipe',
        encoding: 'utf-8',
        windowsHide: true,
      });
    } catch (err) {
      if (isGradlePluginOutdated(gradleRootDirectory)) {
        throw new Error(
          `You are using an old version of io.github.khalilou88.jnxplus plugin. Please use version ${jnxplusGradlePluginVersion}`,
        );
      } else {
        throw err;
      }
    }

    const gradleProjects: GradleProjectType[] = JSON.parse(
      fs.readFileSync(outputFile, 'utf8'),
    );

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
