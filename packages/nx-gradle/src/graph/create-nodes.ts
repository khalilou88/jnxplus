import { CreateNodes, ProjectConfiguration, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getExecutable, getGradleRootDirectory } from '../utils';
import {
  GradleProjectType,
  getProjectName,
  getProjectRoot,
  outputFile,
} from './graph-utils';

export const createNodes: CreateNodes = [
  'nx.json',
  () => {
    const command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

    const gradleRootDirectory = getGradleRootDirectory();
    execSync(command, {
      cwd: path.join(workspaceRoot, gradleRootDirectory),
      env: process.env,
      stdio: 'pipe',
      encoding: 'utf-8',
      windowsHide: true,
    });

    const gradleProjects: GradleProjectType[] = JSON.parse(
      fs.readFileSync(outputFile, 'utf8'),
    );

    const projects: Record<string, ProjectConfiguration> = {};

    for (const project of gradleProjects) {
      const projectRoot = getProjectRoot(gradleRootDirectory, project);
      const projectName = getProjectName(project);

      projects[projectRoot] = {
        root: projectRoot,
        name: projectName,
        tags: ['nx-gradle'],
      };
    }

    return projects;
  },
];
