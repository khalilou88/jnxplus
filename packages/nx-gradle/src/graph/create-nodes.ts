import { CreateNodes, readJsonFile, workspaceRoot } from '@nx/devkit';
import * as fs from 'fs';
import { dirname, join } from 'path';
import { getGradleRootDirectory, getRootProjectName } from '../utils';

export const createNodes: CreateNodes = [
  '{**/build.gradle,**/build.gradle.kts}',
  (buildGradleFilePath: string) => {
    const projectRoot = dirname(buildGradleFilePath);

    const projectName = getProjectName(projectRoot);

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

export function getProjectName(
  projectRoot: string,
  isProjectJsonExists?: boolean,
) {
  const gradleRootDirectory = getGradleRootDirectory();
  const projectJsonPath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'project.json',
  );
  const settingsGradlePath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'settings.gradle',
  );
  const settingsGradleKtsPath = join(
    workspaceRoot,
    gradleRootDirectory,
    projectRoot,
    'settings.gradle.kts',
  );

  if (isProjectJsonExists || fs.existsSync(projectJsonPath)) {
    const projectJson = readJsonFile(projectJsonPath);
    return projectJson.name;
  } else if (fs.existsSync(settingsGradlePath)) {
    const settingsGradleContent = fs.readFileSync(settingsGradlePath, 'utf-8');
    return getRootProjectName(settingsGradleContent);
  } else if (fs.existsSync(settingsGradleKtsPath)) {
    const settingsGradleKtsContent = fs.readFileSync(
      settingsGradleKtsPath,
      'utf-8',
    );
    return getRootProjectName(settingsGradleKtsContent);
  }

  return generateName(projectRoot);
}

export function generateName(projectRoot: string) {
  return projectRoot
    .replace(new RegExp('^\\.', 'g'), '')
    .replace(new RegExp('/', 'g'), '-');
}
