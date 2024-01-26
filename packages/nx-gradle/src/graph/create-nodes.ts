import { CreateNodes } from '@nx/devkit';
import { dirname } from 'path';
import { getProjectName } from '../utils';

export const createNodes: CreateNodes = [
  '{**/build.gradle,**/build.gradle.kts}',
  (buildFilePath: string) => {
    const projectRoot = dirname(buildFilePath);

    const projectName = getProjectName(projectRoot);

    return {
      projects: {
        [projectRoot]: {
          name: projectName,
          root: projectRoot,
          tags: ['nx-gradle'],
        },
      },
    };
  },
];
