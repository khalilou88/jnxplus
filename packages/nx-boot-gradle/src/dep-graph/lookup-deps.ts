import {
  getDependencies,
  getDependencyProjectName,
  getManagedProjects,
  getParentProjectName,
  getProjects,
} from '@jnxplus/gradle';
import {
  Hasher,
  ProjectGraph,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
  workspaceRoot,
} from '@nx/devkit';
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
    const projectRoot = settingsGradleProject.replace('/:/g', '/');
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

    if (project.buildFile === 'groovy') {
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

    if (project.buildFile === 'kotlin') {
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
