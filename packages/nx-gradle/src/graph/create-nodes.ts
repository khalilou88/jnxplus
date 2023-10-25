import { CreateNodes } from '@nx/devkit';
import { dirname } from 'path';
import { getProjectName } from '../utils';

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
