import { getRootProjectName } from '@jnxplus/gradle';
import { CreateNodes, readJsonFile, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { dirname, join } from 'path';

export const createNodes: CreateNodes = [
  '**/build.gradle*',
  (buildGradleFilePath: string) => {
    let projectName;
    const projectRoot = dirname(buildGradleFilePath);

    const projectJsonPath = join(workspaceRoot, projectRoot, 'project.json');
    const settingsGradlePath = join(workspaceRoot, projectRoot, 'project.json');
    const settingsGradleKtsPath = join(
      workspaceRoot,
      projectRoot,
      'project.json',
    );

    if (fs.existsSync(projectJsonPath)) {
      const projectJson = readJsonFile(projectJsonPath);
      projectName = projectJson.name;
    } else if (fs.existsSync(settingsGradlePath)) {
      const settingsGradleContent = fs.readFileSync(
        settingsGradlePath,
        'utf-8',
      );
      projectName = getRootProjectName(settingsGradleContent);
    } else if (fs.existsSync(settingsGradleKtsPath)) {
      const settingsGradleKtsContent = fs.readFileSync(
        settingsGradleKtsPath,
        'utf-8',
      );
      projectName = getRootProjectName(settingsGradleKtsContent);
    }

    return {
      projects: {
        [projectName]: {
          root: projectRoot,
          tags: ['nx-gradle'],
        },
      },
    };
  },
];
