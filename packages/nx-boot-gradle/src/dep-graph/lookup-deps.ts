import {
  Hasher,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
  ProjectGraphProjectNode,
  workspaceRoot,
} from '@nrwl/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';

export function processProjectGraph(
  graph: ProjectGraph,
  context: ProjectGraphProcessorContext
): ProjectGraph {
  const builder = new ProjectGraphBuilder(graph);
  const hasher = new Hasher(graph, context.nxJsonConfiguration, {});

  const settingsGradlePath = join(workspaceRoot, 'settings.gradle');
  const settingsGradleKtsPath = join(workspaceRoot, 'settings.gradle.kts');

  let parentProjectName: string;
  let settingsGradle: string;
  if (fileExists(settingsGradlePath)) {
    settingsGradle = fs.readFileSync(settingsGradlePath, 'utf-8');
    parentProjectName = getParentProjectName(settingsGradle);
    builder.addNode({
      name: parentProjectName,
      type: 'app',
      data: {
        root: '',
        files: [
          {
            file: 'build.gradle',
            hash: hasher.hashFile('build.gradle'),
          },
          {
            file: 'settings.gradle',
            hash: hasher.hashFile('settings.gradle'),
          },
          {
            file: 'gradle.properties',
            hash: hasher.hashFile('gradle.properties'),
          },
        ],
      },
    });
  }

  if (fileExists(settingsGradleKtsPath)) {
    settingsGradle = fs.readFileSync(settingsGradleKtsPath, 'utf-8');
    parentProjectName = getParentProjectName(settingsGradle);
    builder.addNode({
      name: parentProjectName,
      type: 'app',
      data: {
        root: '',
        files: [
          {
            file: 'build.gradle.kts',
            hash: hasher.hashFile('build.gradle.kts'),
          },
          {
            file: 'settings.gradle.kts',
            hash: hasher.hashFile('settings.gradle.kts'),
          },
          {
            file: 'gradle.properties',
            hash: hasher.hashFile('gradle.properties'),
          },
        ],
      },
    });
  }

  const managedProjects = getManagedProjects(builder.graph.nodes);
  const settingsGradleProjects = getProjects(settingsGradle);

  for (const settingsGradleProject of settingsGradleProjects) {
    const projectRoot = settingsGradleProject.replace(':', '/');
    const node = managedProjects.find(
      (project) => project.data.root === projectRoot
    );

    builder.addStaticDependency(
      node.name,
      parentProjectName,
      join(
        projectRoot,
        node.buildFile === 'groovy' ? 'build.gradle' : 'build.gradle.kts'
      ).replace(/\\/g, '/')
    );
  }

  for (const project of managedProjects) {
    let buildGradleContents = '';

    if (project.buildFile == 'groovy') {
      const buildGradleFile = join(
        workspaceRoot,
        project.data.root,
        'build.gradle'
      );

      buildGradleContents = fs.readFileSync(buildGradleFile, 'utf-8');
      const deps = getDependencies(buildGradleContents);
      for (const dep of deps) {
        const dependencyProjectName = getDependencyProjectName(
          dep,
          managedProjects
        );
        builder.addStaticDependency(
          project.name,
          dependencyProjectName,
          join(project.data.root, 'build.gradle').replace(/\\/g, '/')
        );
      }
    }

    if (project.buildFile == 'kotlin') {
      const buildGradleKtsFile = join(
        workspaceRoot,
        project.data.root,
        'build.gradle.kts'
      );

      buildGradleContents = fs.readFileSync(buildGradleKtsFile, 'utf-8');
      const deps = getDependencies(buildGradleContents);
      for (const dep of deps) {
        const dependencyProjectName = getDependencyProjectName(
          dep,
          managedProjects
        );

        builder.addStaticDependency(
          project.name,
          dependencyProjectName,
          join(project.data.root, 'build.gradle.kts').replace(/\\/g, '/')
        );
      }
    }
  }

  return builder.getUpdatedProjectGraph();
}

type BuildFileType = 'groovy' | 'kotlin' | 'undefined';
type ProjectGraphProjectNodeExtended = ProjectGraphProjectNode & {
  buildFile: BuildFileType;
};

function getManagedProjects(
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

function getParentProjectName(settingsGradle: string) {
  const regexp = /rootProject.name\s*=\s*['"](.*)['"]/g;
  const maches = (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return maches[0];
}

function getProjects(settingsGradle: string) {
  const regexp = /include\s*\(['"](.*)['"]\)/g;
  return (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependencies(buildGradleContents: string) {
  const regexp = /project\s*\(['"](.*)['"]\)/g;
  return (buildGradleContents.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
}

function getDependencyProjectName(
  gradleProjectPath: string,
  managedProjects: ProjectGraphProjectNode[]
) {
  const [, ...folders] = gradleProjectPath.split(':');
  const root = folders.join('/');
  const node = managedProjects.find((project) => project.data.root === root);

  return (
    node?.name || gradleProjectPath.split(':libs:').pop().replace(/:/g, '-')
  );
}
