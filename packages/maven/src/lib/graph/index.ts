import { getProjectGraphNodeType } from '@jnxplus/common';
import {
  FileData,
  ProjectGraphBuilder,
  ProjectGraphProcessorContext,
  joinPathFragments,
  workspaceRoot,
} from '@nx/devkit';
import * as fs from 'fs';
import { fileExists } from 'nx/src/utils/fileutils';
import * as path from 'path';
import { join } from 'path';
import { XmlDocument } from 'xmldoc';
import { readXml } from '../xml';

type MavenProjectType = {
  name?: string;
  artifactId: string;
  projectDirPath: string;
  dependencies: (string | undefined)[];
  parentProjectArtifactId?: string;
  aggregatorProjectArtifactId?: string;
};

export function addProjectsAndDependencies(
  builder: ProjectGraphBuilder,
  context: ProjectGraphProcessorContext,
  pluginName: string,
) {
  const projects: MavenProjectType[] = [];
  addProjects(builder, context, projects, pluginName, '');
  addDependencies(builder, projects);
}

function addProjects(
  builder: ProjectGraphBuilder,
  context: ProjectGraphProcessorContext,
  projects: MavenProjectType[],
  pluginName: string,
  projectRoot: string,
  aggregatorProjectArtifactId?: string,
) {
  //projectDirPath
  const projectDirPath = join(workspaceRoot, projectRoot);
  const projectJsonPath = join(projectDirPath, 'project.json');
  const pomXmlPath = join(projectDirPath, 'pom.xml');
  const pomXmlContent = readXml(pomXmlPath);

  //artifactId
  const artifactIdXml = pomXmlContent.childNamed('artifactId');
  if (artifactIdXml === undefined) {
    throw new Error(`artifactId not found in pom.xml ${pomXmlPath}`);
  }
  const artifactId = artifactIdXml.val;

  //projectName
  let projectName;
  const isProjectJsonExists = fileExists(projectJsonPath);
  if (isProjectJsonExists) {
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
    projectName = projectJson.name;
  }

  //add project to graph
  if (!isProjectJsonExists) {
    const projectGraphNodeType = getProjectGraphNodeType(projectRoot);
    builder.addNode({
      name: artifactId,
      type: projectGraphNodeType,
      data: {
        root: projectRoot,
        projectType: projectGraphNodeType === 'app' ? 'application' : 'library',
        targets: {
          build: {
            executor: `${pluginName}:run-task`,
            options: {
              task: getTask(projectRoot, projectGraphNodeType),
            },
          },
          'run-task': {
            executor: `${pluginName}:run-task`,
          },
        },
      },
    });

    const projectSourceFile = joinPathFragments(projectRoot, 'pom.xml');
    //TODO fix hash
    const fileData: FileData[] = [{ file: projectSourceFile, hash: 'abc' }];
    context.fileMap[artifactId] = fileData;
  }

  const parentProjectArtifactId = getParentProjectName(pomXmlContent);
  const dependencies = getDependencyArtifactIds(pomXmlContent);
  projects.push({
    name: projectName,
    artifactId: artifactId,
    projectDirPath: projectDirPath,
    dependencies: dependencies,
    parentProjectArtifactId: parentProjectArtifactId,
    aggregatorProjectArtifactId: aggregatorProjectArtifactId,
  });

  const modulesXmlElement = pomXmlContent.childNamed('modules');
  if (modulesXmlElement === undefined) {
    return;
  }

  const moduleXmlElementArray = modulesXmlElement.childrenNamed('module');
  if (moduleXmlElementArray.length === 0) {
    return;
  }

  for (const moduleXmlElement of moduleXmlElementArray) {
    const moduleRoot = joinPathFragments(
      projectRoot,
      moduleXmlElement.val.trim(),
    );
    addProjects(builder, context, projects, pluginName, moduleRoot, artifactId);
  }
}

function getParentProjectName(pomXmlContent: XmlDocument): string | undefined {
  const parentXmlElement = pomXmlContent.childNamed('parent');
  if (parentXmlElement === undefined) {
    return undefined;
  }

  const relativePath = parentXmlElement.childNamed('relativePath')?.val;

  if (!relativePath) {
    return undefined;
  }

  return parentXmlElement.childNamed('artifactId')?.val;
}

function addDependencies(
  builder: ProjectGraphBuilder,
  projects: MavenProjectType[],
) {
  for (const project of projects) {
    const projectRoot = path.relative(workspaceRoot, project.projectDirPath);

    const projectSourceFile = joinPathFragments(projectRoot, 'pom.xml');

    if (project.parentProjectArtifactId) {
      const parentProject = getProject(
        projects,
        project.parentProjectArtifactId,
      );
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        parentProject.name ?? parentProject.artifactId,
        projectSourceFile,
      );
    }

    if (
      project.aggregatorProjectArtifactId &&
      project.aggregatorProjectArtifactId !== project.parentProjectArtifactId
    ) {
      const aggregatorProject = getProject(
        projects,
        project.aggregatorProjectArtifactId,
      );
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        aggregatorProject.name ?? aggregatorProject.artifactId,
        projectSourceFile,
      );
    }

    const dependencies = getDependencyProjects(project, projects);
    for (const dependency of dependencies) {
      builder.addStaticDependency(
        project.name ?? project.artifactId,
        dependency.name ?? dependency.artifactId,
        projectSourceFile,
      );
    }
  }
}

function getProject(projects: MavenProjectType[], artifactId: string) {
  const project = projects.find((project) => project.artifactId === artifactId);

  if (!project) {
    throw new Error(`Project ${artifactId} not found`);
  }

  return project;
}

function getDependencyArtifactIds(pomXml: XmlDocument) {
  const dependenciesXml = pomXml.childNamed('dependencies');
  if (dependenciesXml === undefined) {
    return [];
  }

  return dependenciesXml
    .childrenNamed('dependency')
    .map((dependencyXmlElement) => {
      return dependencyXmlElement.childNamed('artifactId')?.val;
    });
}

function getDependencyProjects(
  project: MavenProjectType,
  projects: MavenProjectType[],
) {
  return projects.filter((p) => project.dependencies.includes(p.artifactId));
}

export function getTask(
  projectRoot: string,
  projectGraphNodeType: 'app' | 'e2e' | 'lib',
) {
  if (!projectRoot) {
    return 'install -N';
  }

  if (projectGraphNodeType === 'app') {
    return 'compile';
  }

  return 'install';
}
