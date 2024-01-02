import {
  ExecutorContext,
  readJsonFile,
  workspaceRoot,
  writeJsonFile,
} from '@nx/devkit';
import { execSync } from 'child_process';
import * as path from 'path';
import { UpdateXmlDepsExecutorSchema } from './schema';

export default async function runExecutor(
  options: UpdateXmlDepsExecutorSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  context: ExecutorContext,
) {
  console.log('Executor ran for update-xml-deps', options);

  //update package.json files
  updateFile(options.version, 'packages/nx-maven');

  const commitMessage = `release: write @jnxplus/xml version ${options.version} in dependencies section`;

  const commit = `git commit --no-verify -m "${commitMessage}" packages/nx-maven/package.json`;
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
  const packageJsonPath = path.join(workspaceRoot, projectRoot, 'package.json');
  const json = readJsonFile(packageJsonPath);
  json.dependencies['@jnxplus/xml'] = `${newVersion}`;
  writeJsonFile(packageJsonPath, json);
}
