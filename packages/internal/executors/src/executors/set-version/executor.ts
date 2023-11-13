import { getProjectRoot } from '@jnxplus/common';
import { ExecutorContext, workspaceRoot } from '@nx/devkit';
import { execSync } from 'child_process';
import { SetVersionExecutorSchema } from './schema';

import * as fs from 'fs';
import * as path from 'path';

export default async function runExecutor(
  options: SetVersionExecutorSchema,
  context: ExecutorContext,
) {
  console.log('Executor ran for SetVersion', options);

  const projectRoot = getProjectRoot(context);

  //change file
  updateFile(options.version, projectRoot);
  updateFile2(options.version);

  const commitMessage = `release: write version ${options.version} in gradle.build`;

  const commit = `git commit --no-verify -m "${commitMessage}" packages/gradle-plugin/build.gradle packages/common/src/lib/versions/index.ts`;
  execSync(commit, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  const push = `git push`;
  execSync(push, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  return { success: true };
}

function updateFile(newVersion: string, projectRoot: string) {
  const buildGradlePath = path.join(projectRoot, 'build.gradle');
  const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf-8');
  const newContent = setVersion(buildGradleContent, newVersion);
  fs.writeFileSync(buildGradlePath, newContent);
}

function setVersion(buildGradleContent: string, newVersion: string) {
  return buildGradleContent.replace(
    /(version\s=\s')(.*)(')/,
    `$1${newVersion}$3`,
  );
}

function updateFile2(newVersion: string) {
  const indexTsPath = path.join(
    workspaceRoot,
    'packages/common/src/lib/versions/index.ts',
  );
  const indexTsContent = fs.readFileSync(indexTsPath, 'utf-8');
  const newContent = setVersion2(indexTsContent, newVersion);
  fs.writeFileSync(indexTsPath, newContent);
}

function setVersion2(indexTsContent: string, newVersion: string) {
  return indexTsContent.replace(
    /(export\s*const\s*jnxplusGradlePluginVersion\s*=\s*')(.*)(')/,
    `$1${newVersion}$3`,
  );
}
