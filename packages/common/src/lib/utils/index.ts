import {
  ExecutorContext,
  NxJsonConfiguration,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import * as path from 'path';
import { TargetsType } from '../types';

export function getProject(context: ExecutorContext) {
  if (!context.projectName) {
    throw new Error('No project name found in context');
  }

  const project =
    context?.projectsConfigurations?.projects[context.projectName];

  if (!project) {
    throw new Error(
      `No project found in project graph for ${context.projectName}`,
    );
  }
  return project;
}

export function getProjectRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.root;
}

export function isRootProject(context: ExecutorContext): boolean {
  const projectRoot = getProjectRoot(context);
  return !projectRoot;
}

export function getProjectType(context: ExecutorContext) {
  const project = getProject(context);
  return project.projectType;
}

export function getProjectSourceRoot(context: ExecutorContext) {
  const project = getProject(context);
  return project.sourceRoot;
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

export function getPluginName(context: ExecutorContext) {
  return context.target?.executor?.split(':')[0];
}

function titleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map(function (word) {
      return word.replace(word[0], word[0].toUpperCase());
    })
    .join(' ');
}

export function getTargetName(context: ExecutorContext) {
  if (!context.targetName) {
    throw new Error('targetName must set');
  }
  return titleCase(context.targetName.replace(/-/g, ' '));
}

export function clearEmpties(o: TargetsType) {
  for (const k in o) {
    if (!o[k] || typeof o[k] !== 'object') {
      continue; // If null or not an object, skip to the next iteration
    }

    // The property is an object
    if (Object.keys(o[k]).length === 0) {
      delete o[k]; // The object had no properties, so delete that property
    }
  }

  return o;
}

export function getBuildTool(): '@jnxplus/nx-gradle' | '@jnxplus/nx-maven' {
  const nxJsonPath = path.join(workspaceRoot, 'nx.json');

  const nxJson = readJsonFile<NxJsonConfiguration>(nxJsonPath);

  const pluginPath = '@jnxplus/nx-gradle';

  const hasPlugin = nxJson.plugins?.some((p) =>
    typeof p === 'string' ? p === pluginPath : p.plugin === pluginPath,
  );

  if (hasPlugin) {
    return pluginPath;
  }

  return '@jnxplus/nx-maven';
}
