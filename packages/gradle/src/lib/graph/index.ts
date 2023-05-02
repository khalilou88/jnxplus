import { ProjectGraphProjectNode, workspaceRoot } from '@nx/devkit';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';

type BuildFileType = 'groovy' | 'kotlin' | 'undefined';
type ProjectGraphProjectNodeExtended = ProjectGraphProjectNode & {
  buildFile: BuildFileType;
};

export function getManagedProjects(
  nodes: Record<string, ProjectGraphProjectNode>
): ProjectGraphProjectNodeExtended[] {
  return Object.entries(nodes)
    .filter((node) => isAppOrLibProject(node[1]))
    .map((node) => extendProjectGraphProjectNode(node[1]))
    .filter((node) => isManagedProject(node));
}

function isManagedProject(
  projectGraphProjectNodeExtended: ProjectGraphProjectNodeExtended
): boolean {
  return (
    projectGraphProjectNodeExtended.buildFile === 'groovy' ||
    projectGraphProjectNodeExtended.buildFile === 'kotlin'
  );
}

function extendProjectGraphProjectNode(
  projectGraphProjectNode: ProjectGraphProjectNode
): ProjectGraphProjectNodeExtended {
  let buildFile: BuildFileType = 'undefined';

  const buildGradleFile = join(
    workspaceRoot,
    projectGraphProjectNode.data.root,
    'build.gradle'
  );

  if (fileExists(buildGradleFile)) {
    buildFile = 'groovy';
  }

  const buildGradleKtsFile = join(
    workspaceRoot,
    projectGraphProjectNode.data.root,
    'build.gradle.kts'
  );
  if (fileExists(buildGradleKtsFile)) {
    buildFile = 'kotlin';
  }

  return {
    ...projectGraphProjectNode,
    buildFile: buildFile,
  };
}

function isAppOrLibProject(
  projectGraphProjectNode: ProjectGraphProjectNode
): boolean {
  return (
    projectGraphProjectNode.type === 'app' ||
    projectGraphProjectNode.type === 'lib'
  );
}

export function getParentProjectName(settingsGradle: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const matches = (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

export function getProjects(settingsGradle: string) {
  const regexp = /include\s*\(['"](.*)['"]\)/g;
  return (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

export function getDependencies(buildGradleContents: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (buildGradleContents.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

export function getDependencyProjectName(
  gradleProjectPath: string,
  managedProjects: ProjectGraphProjectNode[]
) {
  const [, ...folders] = gradleProjectPath.split(':');
  const root = folders.join('/');
  const node = managedProjects.find((project) => project.data.root === root);

  return (
    node?.name || gradleProjectPath.split(':libs:').pop()?.replace(/:/g, '-')
  );
}
