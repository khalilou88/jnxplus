import { getProjectRoot } from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import { join } from 'path';
import { SetVersionExecutorSchema } from './schema';

import * as fs from 'fs';
import * as path from 'path';

export default async function runExecutor(
  options: SetVersionExecutorSchema,
  context: ExecutorContext
) {
  console.log('Executor ran for SetVersion', options);

  const projectRoot = getProjectRoot(context);

  //change file
  updateFile(options.version, projectRoot);

  //commit
  const commit = `git commit -m ${options.commitMessageFormat}`;
  execSync(commit, {
    cwd: join(workspaceRoot, projectRoot),
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  // push tag
  const push = `git push origin ${options.tag}`;
  execSync(push, {
    cwd: join(workspaceRoot, projectRoot),
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  for (const task in options.postTargets) {
    execSync(`nx run ${task}`, {
      cwd: workspaceRoot,
      stdio: 'inherit',
      env: process.env,
      encoding: 'utf-8',
    });
  }

  return { success: true };
}

function updateFile(newVersion: string, projectRoot: string) {
  const buildGradlePath = path.join(projectRoot, 'build.gradle');
  const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');
  const newContent = setVersion(buildGradleContent, newVersion);
  fs.writeFileSync(buildGradlePath, newContent);
}

export function setVersion(buildGradleContent: string, newVersion: string) {
  return buildGradleContent.replace(
    /(version\s=\s')(.*)(')/,
    `$1${newVersion}$3`
  );
}
