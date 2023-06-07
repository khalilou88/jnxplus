import { getProjectGraphNodeType } from '@jnxplus/common';
import {
  ProjectGraphBuilder,
  joinPathFragments,
  workspaceRoot,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { projectGraphCacheDirectory } from 'nx/src/utils/cache-directory';
import * as path from 'path';
import { getExecutable } from '../utils';

type GradleProject1Type = {
  name: string;
  projectDirPath: string;
  isProjectJsonExists: boolean;
  isBuildGradleExists: boolean;
};

type GradleProject2Type = {
  isBuildGradleKtsExists: boolean;
  isSettingsGradleExists: boolean;
  isSettingsGradleKtsExists: boolean;
  isGradlePropertiesExists: boolean;
  parentProjectName: string;
  dependencies: GradleProject1Type[];
};

type GradleProjectType = GradleProject1Type & GradleProject2Type;

export function addProjectsAndDependenciesFromTask(
  builder: ProjectGraphBuilder,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginName: string
) {
  const isVerbose = process.env['NX_VERBOSE_LOGGING'] === 'true';
  const outputFile = path.join(
    projectGraphCacheDirectory,
    `nx-gradle-deps.json`
  );

  let command = `${getExecutable()} :projectDependencyTask --outputFile=${outputFile}`;

  if (isVerbose) {
    command += ' --stacktrace';
  }

  execSync(command, {
    cwd: workspaceRoot,
    stdio: isVerbose ? 'inherit' : 'pipe',
    env: process.env,
    encoding: 'utf-8',
  });

  const projects: GradleProjectType[] = JSON.parse(
    fs.readFileSync(outputFile, 'utf8')
  );

  addProjects(builder, projects);

  addDependencies(builder, projects);
}

function addProjects(
  builder: ProjectGraphBuilder,
  projects: GradleProjectType[]
) {
  for (const project of projects) {
    if (
      project.isBuildGradleExists ||
      project.isBuildGradleKtsExists ||
      project.isSettingsGradleExists ||
      project.isSettingsGradleKtsExists
    ) {
      if (!project.isProjectJsonExists) {
        const projectRoot = path.relative(
          workspaceRoot,
          project.projectDirPath
        );

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
          },
        });
      }
    }
  }
}

function addDependencies(
  builder: ProjectGraphBuilder,
  projects: GradleProjectType[]
) {
  for (const project of projects) {
    if (project.isBuildGradleExists || project.isBuildGradleKtsExists) {
      const projectName = getProjectName(project);
      const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

      if (projectRoot.startsWith('apps') || projectRoot.startsWith('libs')) {
        throw new Error(
          `ProjectRoot ${projectRoot} shoud starts with apps or libs`
        );
      }

      const projectSourceFile = project.isBuildGradleExists
        ? 'build.gradle'
        : 'build.gradle.kts';

      const parentProject = getParentProject(
        projects,
        project.parentProjectName
      );
      if (parentProject) {
        const parentProjectName = getProjectName(parentProject);

        builder.addStaticDependency(
          projectName,
          parentProjectName,
          joinPathFragments(projectRoot, projectSourceFile)
        );
      }

      for (const dependency of project.dependencies) {
        const dependencyName = getProjectName(dependency);

        builder.addStaticDependency(
          projectName,
          dependencyName,
          joinPathFragments(projectRoot, projectSourceFile)
        );
      }
    }
  }
}

function getProjectName(project: GradleProject1Type) {
  if (project.isProjectJsonExists) {
    const projectJsonPath = path.join(project.projectDirPath, 'project.json');
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    return projectJson.name;
  }

  return project.name;
}

function getParentProject(
  projects: GradleProjectType[],
  parentProjectName: string
): GradleProjectType | undefined {
  const project = projects.find(
    (element) => element.name === parentProjectName
  );

  if (!project) {
    return undefined;
  }

  if (
    project.isBuildGradleExists ||
    project.isBuildGradleKtsExists ||
    project.isSettingsGradleExists ||
    project.isSettingsGradleKtsExists
  ) {
    return project;
  }

  return getParentProject(projects, project.parentProjectName);
}
