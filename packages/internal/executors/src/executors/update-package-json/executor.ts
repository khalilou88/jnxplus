import {
  ExecutorContext,
  readJsonFile,
  workspaceRoot,
  writeJsonFile,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as path from 'path';
import { UpdatePackageJsonExecutorSchema } from './schema';

export default async function runExecutor(
  options: UpdatePackageJsonExecutorSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ExecutorContext,
) {
  console.log('Executor ran for update-package-json', options);

  const projectName = context.projectName;

  //update package.json files
  updateFile(options.version, `packages/${projectName}`);

  const commitMessage = `release: write version ${options.version} in package.json`;

  const commit = `git commit --no-verify -m "${commitMessage}" packages/${projectName}/package.json`;
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
  json.version = `${newVersion}`;
  writeJsonFile(packageJsonPath, json);
}
