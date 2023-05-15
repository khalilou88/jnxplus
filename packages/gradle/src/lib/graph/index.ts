import { getProjectGraphNodeType } from '@jnxplus/common';
import {
  Hasher,
  ProjectGraphBuilder,
  joinPathFragments,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';
import { join } from 'path';
import { getExecutable } from '../utils';

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginName: string
) {
  const outputFile = join(projectGraphCacheDirectory, 'gradle-dep-graph.json');

  execSync(`${getExecutable()} projectGraph --outputFile=${outputFile}`, {
    cwd: workspaceRoot,
  }).toString();

  const projects = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  for (const project of projects) {
    if (!project.isProjectJsonExists) {
      const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

      const files = [];

      if (project.isBuildGradleExists) {
        const file = joinPathFragments(projectRoot, 'build.gradle');
        files.push({
          file: file,
          hash: hasher.hashFile(file),
        });
      }

      if (project.isBuildGradleKtsExists) {
        const file = joinPathFragments(projectRoot, 'build.gradle.kts');
        files.push({
          file: file,
          hash: hasher.hashFile(file),
        });
      }

      if (project.isSettingsGradleExists) {
        const file = joinPathFragments(projectRoot, 'settings.gradle');
        files.push({
          file: file,
          hash: hasher.hashFile(file),
        });
      }

      if (project.isSettingsGradleKtsExists) {
        const file = joinPathFragments(projectRoot, 'settings.gradle.kts');
        files.push({
          file: file,
          hash: hasher.hashFile(file),
        });
      }

      if (project.isGradlePropertiesExists) {
        const file = joinPathFragments(projectRoot, 'gradle.properties');
        files.push({
          file: file,
          hash: hasher.hashFile(file),
        });
      }

      const projectGraphNodeType = getProjectGraphNodeType(projectRoot);

      builder.addNode({
        name: project.name,
        type: projectGraphNodeType,
        data: {
          root: projectRoot,
          projectType:
            projectGraphNodeType === 'app' ? 'application' : 'library',
          targets: {
            build: {
              executor: 'nx:noop',
            },
          },
          files: files,
        },
      });
    }
  }

  for (const proj of projects) {
    const projName = getProjectName(proj);
    const projRoot = path.relative(workspaceRoot, proj.projectDirPath);
    const projSourceFile = proj.isBuildGradleExists
      ? 'build.gradle'
      : 'build.gradle.kts';

    for (const subproject of proj.subprojects) {
      const subprojectName = getProjectName(subproject);
      const subprojectRoot = path.relative(
        workspaceRoot,
        subproject.projectDirPath
      );
      const subprojectSourceFile = subproject.isBuildGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      builder.addStaticDependency(
        subprojectName,
        projName,
        joinPathFragments(subprojectRoot, subprojectSourceFile)
      );
    }

    for (const dependency of proj.dependencies) {
      const dependencyName = getProjectName(dependency);

      builder.addStaticDependency(
        projName,
        dependencyName,
        joinPathFragments(projRoot, projSourceFile)
      );
    }
  }
}

function getProjectName(project: {
  name: string;
  isProjectJsonExists: boolean;
  projectDirPath: string;
}) {
  if (project.isProjectJsonExists) {
    const projectJsonPath = join(project.projectDirPath, 'project.json');
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    return projectJson.name;
  }

  return project.name;
}
