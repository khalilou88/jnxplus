import {
  Hasher,
  ProjectGraphBuilder,
  ProjectGraphProjectNode,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import { join } from 'path';

type BuildFileType = 'groovy' | 'kotlin' | 'undefined';
type ProjectGraphProjectNodeExtended = ProjectGraphProjectNode & {
  buildFile: BuildFileType;
};

function getProjects(
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
  const matches = (settingsGradle.match(regexp) || []).map((e) =>
    e.replace(regexp, '$1')
  );
  return matches[0];
}

function getSubProjects(settingsGradle: string) {
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

function getSubProject(
  projectPath: string,
  projects: ProjectGraphProjectNodeExtended[]
) {
  const root = projectPath.replace(/:/g, '/');
  return projects.find((p) => p.data.root === root);
}

function getDepProject(
  projectPath: string,
  projects: ProjectGraphProjectNodeExtended[]
) {
  const root = projectPath.substring(1).replace(/:/g, '/');
  return projects.find((p) => p.data.root === root);
}

export function addProjects(
  builder: ProjectGraphBuilder,
  hasher: Hasher,
  pluginName: string,
  projectRoot: string
) {
  const settingsGradlePath = join(workspaceRoot, 'settings.gradle');
  const settingsGradleKtsPath = join(workspaceRoot, 'settings.gradle.kts');

  if (fileExists(settingsGradlePath)) {
    const settingsGradle = fs.readFileSync(settingsGradlePath, 'utf-8');
    const parentProjectName = getParentProjectName(settingsGradle);
    builder.addNode({
      name: parentProjectName,
      type: 'lib',
      data: {
        root: '',
        targets: {
          build: {
            executor: 'nx:noop',
          },
        },
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
    const settingsGradle = fs.readFileSync(settingsGradleKtsPath, 'utf-8');
    const parentProjectName = getParentProjectName(settingsGradle);
    builder.addNode({
      name: parentProjectName,
      type: 'lib',
      data: {
        root: '',
        targets: {
          build: {
            executor: 'nx:noop',
          },
        },
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
}

export function addDependencies(builder: ProjectGraphBuilder) {
  const projects = getProjects(builder.graph.nodes);

  for (const project of projects) {
    if (project.buildFile === 'groovy') {
      let buildGradleContent = '';
      let settingsGradleContent = '';

      const buildGradleFile = join(
        workspaceRoot,
        project.data.root,
        'build.gradle'
      );

      const settingsGradleFile = join(
        workspaceRoot,
        project.data.root,
        'settings.gradle'
      );

      if (fs.existsSync(settingsGradleFile)) {
        settingsGradleContent = fs.readFileSync(settingsGradleFile, 'utf-8');
      }
      const subProjects = getSubProjects(settingsGradleContent);
      for (const subProjectPath of subProjects) {
        const subProject = getSubProject(subProjectPath, projects);
        builder.addStaticDependency(
          subProject?.name || 'no-sub-project-1',
          project.name,
          join(
            subProject?.data?.root || '',
            subProject?.buildFile === 'groovy'
              ? 'build.gradle'
              : 'build.gradle.kts'
          ).replace(/\\/g, '/')
        );
      }

      buildGradleContent = fs.readFileSync(buildGradleFile, 'utf-8');
      const dependencies = getDependencies(buildGradleContent);
      for (const dependencyPath of dependencies) {
        const dependency = getDepProject(dependencyPath, projects);
        builder.addStaticDependency(
          project.name,
          dependency?.name || 'no-dep-project-1',
          join(project.data.root, 'build.gradle').replace(/\\/g, '/')
        );
      }
    }

    if (project.buildFile === 'kotlin') {
      let buildGradleContentKts = '';
      let settingsGradleContentKts = '';

      const buildGradleKtsFile = join(
        workspaceRoot,
        project.data.root,
        'build.gradle.kts'
      );

      const settingsGradleKtsFile = join(
        workspaceRoot,
        project.data.root,
        'settings.gradle.kts'
      );

      if (fs.existsSync(settingsGradleKtsFile)) {
        settingsGradleContentKts = fs.readFileSync(
          settingsGradleKtsFile,
          'utf-8'
        );
      }
      const subProjects = getSubProjects(settingsGradleContentKts);
      for (const subProjectPath of subProjects) {
        const subProject = getSubProject(subProjectPath, projects);
        builder.addStaticDependency(
          subProject?.name || 'no-sub-project-2',
          project.name,
          join(
            subProject?.data?.root || '',
            subProject?.buildFile === 'groovy'
              ? 'build.gradle'
              : 'build.gradle.kts'
          ).replace(/\\/g, '/')
        );
      }

      buildGradleContentKts = fs.readFileSync(buildGradleKtsFile, 'utf-8');
      const dependencies = getDependencies(buildGradleContentKts);
      for (const dependencyPath of dependencies) {
        const dependency = getDepProject(dependencyPath, projects);
        builder.addStaticDependency(
          project.name,
          dependency?.name || 'no-dep-project-2',
          join(project.data.root, 'build.gradle.kts').replace(/\\/g, '/')
        );
      }
    }
  }
}
