import { getProjectGraphNodeType } from '@jnxplus/common';
import {
  Hasher,
  ProjectGraphBuilder,
  joinPathFragments,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import * as path from 'path';
import { canUseGradleTask, getProjectRootFromProjectPath } from '../utils';
import { addProjectsAndDependenciesFromTask } from './graph-task';

type GradleProjectType = {
  name: string;
  path: string;
  root: string;
  sourceFile: string;
  subprojects: string[];
  dependencies: string[];
};

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string
) {
  if (canUseGradleTask()) {
    addProjectsAndDependenciesFromTask(builder, hasher, pluginName);
  } else {
    addProjectsAndDependenciesLegacy(builder, hasher, pluginName);
  }
}

function addProjectsAndDependenciesLegacy(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string
) {
  const projects: GradleProjectType[] = [];
  addProjects(builder, hasher, projects, pluginName, '');
  addDependencies(builder, projects);
}

function addProjects(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  projects: GradleProjectType[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pluginName: string,
  projectPath: string
) {
  const projectRoot = getProjectRootFromProjectPath(projectPath);
  const projectDirPath = path.join(workspaceRoot, projectRoot);

  const settingsGradlePath = path.join(projectDirPath, 'settings.gradle');
  const isSettingsGradleExists = fileExists(settingsGradlePath);

  const settingsGradleKtsPath = path.join(
    projectDirPath,
    'settings.gradle.kts'
  );
  const isSettingsGradleKtsExists = fileExists(settingsGradleKtsPath);

  const buildGradlePath = path.join(projectDirPath, 'build.gradle');
  const isBuildGradleExists = fileExists(buildGradlePath);

  const buildGradleKtsPath = path.join(projectDirPath, 'build.gradle.kts');
  const isBuildGradleKtsExists = fileExists(buildGradleKtsPath);

  if (
    !isSettingsGradleExists &&
    !isSettingsGradleKtsExists &&
    !isBuildGradleExists &&
    !isBuildGradleKtsExists
  ) {
    return;
  }

  const projectJsonPath = path.join(projectDirPath, 'project.json');
  const isProjectJsonExists = fileExists(projectJsonPath);

  const gradlePropertiesPath = path.join(projectDirPath, 'gradle.properties');
  const isGradlePropertiesExists = fileExists(gradlePropertiesPath);

  let sourceFile = '';
  let dependencies: string[] = [];
  if (isBuildGradleExists) {
    const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');
    dependencies = getDependencies(buildGradleContent);
    sourceFile = 'build.gradle';
  }

  if (isBuildGradleKtsExists) {
    const buildGradleKtsContent = fs.readFileSync(buildGradleKtsPath, 'utf-8');
    dependencies = getDependencies(buildGradleKtsContent);
    sourceFile = 'build.gradle.kts';
  }

  let rootProjectName;
  let subprojects: string[] = [];
  if (isSettingsGradleExists) {
    const settingsGradleContent = fs.readFileSync(settingsGradlePath, 'utf-8');
    rootProjectName = getRootProjectName(settingsGradleContent);
    subprojects = getSubprojects(settingsGradleContent);
  }

  if (isSettingsGradleKtsExists) {
    const settingsGradleKtsContent = fs.readFileSync(
      settingsGradleKtsPath,
      'utf-8'
    );
    rootProjectName = getRootProjectName(settingsGradleKtsContent);
    subprojects = getSubprojects(settingsGradleKtsContent);
  }

  //project name
  let projectName;
  if (isProjectJsonExists) {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    projectName = projectJson.name;
  }

  if (!isProjectJsonExists) {
    const files = [];

    if (isSettingsGradleExists) {
      const file = joinPathFragments(projectRoot, 'settings.gradle');
      files.push({
        file: file,
        hash: hasher.hashFile(file),
      });
    }

    if (isSettingsGradleKtsExists) {
      const file = joinPathFragments(projectRoot, 'settings.gradle.kts');
      files.push({
        file: file,
        hash: hasher.hashFile(file),
      });
    }

    if (isBuildGradleExists) {
      const file = joinPathFragments(projectRoot, 'build.gradle');
      files.push({
        file: file,
        hash: hasher.hashFile(file),
      });
    }

    if (isBuildGradleKtsExists) {
      const file = joinPathFragments(projectRoot, 'build.gradle.kts');
      files.push({
        file: file,
        hash: hasher.hashFile(file),
      });
    }

    if (isGradlePropertiesExists) {
      const file = joinPathFragments(projectRoot, 'gradle.properties');
      files.push({
        file: file,
        hash: hasher.hashFile(file),
      });
    }

    const projectGraphNodeType = getProjectGraphNodeType(projectRoot);

    builder.addNode({
      name: rootProjectName || createProjectName(projectPath),
      type: projectGraphNodeType,
      data: {
        root: projectRoot,
        projectType: projectGraphNodeType === 'app' ? 'application' : 'library',
        targets: {
          build: {
            executor: 'nx:noop',
          },
        },
        files: files,
      },
    });
  }

  projects.push({
    name: rootProjectName || projectName || createProjectName(projectPath),
    path: projectPath,
    root: projectRoot,
    sourceFile: sourceFile,
    subprojects: subprojects,
    dependencies: dependencies,
  });

  if (subprojects.length === 0) {
    return;
  }

  for (const subprojectPath of subprojects) {
    addProjects(builder, hasher, projects, pluginName, subprojectPath);
  }
}

function addDependencies(
  builder: ProjectGraphBuilder,
  projects: GradleProjectType[]
) {
  for (const project of projects) {
    const dependencies = projects.filter((p) =>
      project.dependencies.includes(p.path)
    );

    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name,
        dependency.name,
        joinPathFragments(project.root, project.sourceFile)
      );
    }

    const subprojects = projects.filter((p) =>
      project.subprojects.includes(p.path)
    );

    for (const subproject of subprojects) {
      builder.addStaticDependency(
        subproject.name,
        project.name,
        joinPathFragments(subproject.root, subproject.sourceFile)
      );
    }
  }
}

function createProjectName(projectPath: string) {
  if (!projectPath) {
    throw new Error('project path is mandatory to create a project name');
  }

  if (projectPath.startsWith(':')) {
    throw new Error(`Path ${projectPath} should not starts with two dots (:)`);
  }

  return projectPath.replace(/:/g, '-');
}

export function getRootProjectName(settingsGradleContent: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const matches = (settingsGradleContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getSubprojects(settingsGradleContent: string): string[] {
  const regexp = /include\s*\(*(['"].*['"])\)*/g;
  const matches = (settingsGradleContent.match(regexp) || [])
    .map((e) => e.replace(regexp, '$1'))
    .map((e) => e.split(','));

  //TODO remove two dots (:)
  return matches.flat().map((e) => e.replace(/\s*['"](.*)['"]/, '$1'));
}

export function getDependencies(buildGradleContent: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (
    (buildGradleContent.match(regexp) || [])
      .map((e) => e.replace(regexp, '$1'))
      //remove two dots (:)
      .map((e) => e.substring(1))
  );
}
