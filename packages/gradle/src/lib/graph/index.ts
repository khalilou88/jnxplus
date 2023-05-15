import { getProjectGraphNodeType } from '@jnxplus/common';
import { Hasher, ProjectGraphBuilder, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { join } from 'path';
import { getExecutable } from '../utils';

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginName: string
) {
  const outputFile = join(workspaceRoot, 'gradle-dep-graph.json');

  execSync(`${getExecutable()} projectGraph --outputFile=${outputFile}`, {
    cwd: workspaceRoot,
  }).toString();

  const projects = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

  for (const project of projects) {
    if (!project.isProjectJsonExists) {
      const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

      const files = [];

      const projectRootWithSlash = projectRoot ? `${projectRoot}/` : '';
      if (project.isBuildGradleExists) {
        files.push({
          file: `${projectRootWithSlash}build.gradle`,
          hash: hasher.hashFile(`${projectRootWithSlash}build.gradle`),
        });
      }

      if (project.isBuildGradleKtsExists) {
        files.push({
          file: `${projectRootWithSlash}build.gradle.kts`,
          hash: hasher.hashFile(`${projectRootWithSlash}build.gradle.kts`),
        });
      }

      if (project.isSettingsGradleExists) {
        files.push({
          file: `${projectRootWithSlash}settings.gradle`,
          hash: hasher.hashFile(`${projectRootWithSlash}settings.gradle`),
        });
      }

      if (project.isSettingsGradleKtsExists) {
        files.push({
          file: `${projectRootWithSlash}settings.gradle.kts`,
          hash: hasher.hashFile(`${projectRootWithSlash}settings.gradle.kts`),
        });
      }

      if (project.isGradlePropertiesExists) {
        files.push({
          file: `${projectRootWithSlash}gradle.properties`,
          hash: hasher.hashFile(`${projectRootWithSlash}gradle.properties`),
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
    for (const subproject of proj.subprojects) {
      const subprojectRoot = path.relative(
        workspaceRoot,
        subproject.projectDirPath
      );

      const subprojectRootWithSlash = subprojectRoot
        ? `${subprojectRoot}/`
        : '';

      const sourceProjectFile = subproject.isSettingsGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      builder.addStaticDependency(
        subproject.name,
        proj.name,
        `${subprojectRootWithSlash}${sourceProjectFile}`
      );
    }

    for (const dependency of proj.dependencies) {
      const projRoot = path.relative(workspaceRoot, proj.projectDirPath);

      const projRootWithSlash = projRoot ? `${projRoot}/` : '';

      const sourceProjectFile = proj.isSettingsGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      builder.addStaticDependency(
        proj.name,
        dependency.name,
        `${projRootWithSlash}${sourceProjectFile}`
      );
    }
  }
}
