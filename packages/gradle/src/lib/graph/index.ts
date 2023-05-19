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

type GradleProjectType = {
  name?: string;
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
  const projectRoot = pathToRoot(projectPath);
  const projectDirPath = path.join(workspaceRoot, projectRoot);

  const projectJsonPath = path.join(projectDirPath, 'project.json');
  const isProjectJsonExists = fileExists(projectJsonPath);

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

  const gradlePropertiesPath = path.join(projectDirPath, 'gradle.properties');
  const isGradlePropertiesExists = fileExists(gradlePropertiesPath);

  //project name
  let projectName;
  if (isProjectJsonExists) {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    projectName = projectJson.name;
  }

  if (!isProjectJsonExists) {
    const projectRoot = path.relative(workspaceRoot, projectDirPath);

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
      name: projectName,
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

  projects.push({
    name: rootProjectName || projectName,
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
        project.name ?? createProjectName(project.path),
        dependency.name ?? createProjectName(dependency.path),
        joinPathFragments(project.root, project.sourceFile)
      );
    }

    const subprojects = projects.filter((p) =>
      project.subprojects.includes(p.path)
    );

    for (const subproject of subprojects) {
      builder.addStaticDependency(
        subproject.name ?? createProjectName(subproject.path),
        project.name ?? createProjectName(project.path),
        joinPathFragments(subproject.root, subproject.sourceFile)
      );
    }
  }
}

//TODO test when path starts with :
function pathToRoot(path: string) {
  return path.replace(/:/g, '/');
}

//TODO test when path starts with :
function createProjectName(path: string) {
  return path.replace(/:/g, '-');
}

function getRootProjectName(settingsGradle: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const matches = (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

function getSubprojects(settingsGradle: string): string[] {
  const regexp = /include\s*\(['"](.*)['"]\)/g;
  return (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependencies(buildGradleContent: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (buildGradleContent.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}
