import {
  ExecutorContext,
  readJsonFile,
  workspaceRoot,
  writeJsonFile,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as path from 'path';
import { UpdateDependenciesExecutorSchema } from './schema';

export default async function runExecutor(
  options: UpdateDependenciesExecutorSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ExecutorContext,
) {
  console.log('Executor ran for UpdateDependencies', options);

  //update files
  updateFile(options.version, 'packages/nx-gradle');
  updateFile(options.version, 'packages/nx-maven');

  updateFile(options.version, 'packages/create-nx-gradle-workspace');
  updateFile(options.version, 'packages/create-nx-maven-workspace');

  const commitMessage = `release: write @jnxplus/common version ${options.version} in dependencies section`;

  const commit = `git commit --no-verify -m "${commitMessage}" packages/nx-gradle/package.json packages/nx-maven/package.json packages/create-nx-gradle-workspace/package.json packages/create-nx-maven-workspace/package.json`;
  execSync(commit, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  const push = 'git push';
  execSync(push, {
    cwd: workspaceRoot,
    stdio: 'inherit',
    env: process.env,
    encoding: 'utf-8',
  });

  return { success: true };
}

function updateFile(newVersion: string, projectRoot: string) {
  const packageJsonPath = path.join(workspaceRoot, projectRoot, 'package.json');
  const json = readJsonFile(packageJsonPath);
  json.dependencies['@jnxplus/common'] = `${newVersion}`;
  writeJsonFile(packageJsonPath, json);
}
