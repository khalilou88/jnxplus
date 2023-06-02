import {
  getPackageManagerCommand,
  readJsonFile,
  writeJsonFile,
} from '@nx/devkit';
import { exists, tmpProjPath } from '@nx/plugin/testing';
import axios from 'axios';
import * as chalk from 'chalk';
import { ChildProcess, exec, execSync } from 'child_process';
import * as path from 'path';
import { check as portCheck } from 'tcp-port-used';
import * as treeKill from 'tree-kill';
import { promisify } from 'util';
import kill = require('kill-port');
import * as fs from 'fs';

export function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = path.dirname(tmpProjPath());
  return execSync(
    `node ${require.resolve(
      'nx'
    )} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nx/workspace --npmScope=proj --preset=empty ${
      args || ''
    }`,
    {
      cwd: localTmpDir,
      // eslint-disable-next-line no-constant-condition
      ...(silent && false ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    }
  );
}

/**
 * Remove log colors for fail proof string search
 * @param log
 * @returns
 */
function stripConsoleColors(log: string): string {
  return log.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

export function runNxCommandUntil(
  command: string,
  criteria: (output: string) => boolean
): Promise<ChildProcess> {
  const pmc = getPackageManagerCommand();
  const p = exec(`${pmc.exec} nx ${command}`, {
    cwd: tmpProjPath(),
    env: {
      ...process.env,
      FORCE_COLOR: 'false',
    },
    encoding: 'utf-8',
  });
  return new Promise((res, rej) => {
    let output = '';
    let complete = false;

    function checkCriteria(c: any) {
      output += c.toString();
      if (criteria(stripConsoleColors(output)) && !complete) {
        complete = true;
        res(p);
      }
    }

    p.stdout?.on('data', checkCriteria);
    p.stderr?.on('data', checkCriteria);
    p.on('exit', (code) => {
      if (!complete) {
        rej(`Exited with ${code}`);
      } else {
        res(p);
      }
    });
  });
}

const KILL_PORT_DELAY = 5000;

export async function killPort(port: number): Promise<boolean> {
  if (await portCheck(port)) {
    try {
      logInfo(`Attempting to close port ${port}`);
      await kill(port);
      await new Promise<void>((resolve) =>
        setTimeout(() => resolve(), KILL_PORT_DELAY)
      );
      if (await portCheck(port)) {
        logError(`Port ${port} still open`);
      } else {
        logSuccess(`Port ${port} successfully closed`);
        return true;
      }
    } catch {
      logError(`Port ${port} closing failed`);
    }
    return false;
  } else {
    return true;
  }
}

const E2E_LOG_PREFIX = `${chalk.reset.inverse.bold.keyword('orange')(' E2E ')}`;

function e2eConsoleLogger(message: string, body?: string) {
  process.stdout.write('\n');
  process.stdout.write(`${E2E_LOG_PREFIX} ${message}\n`);
  if (body) {
    process.stdout.write(`${body}\n`);
  }
  process.stdout.write('\n');
}

export function logInfo(title: string, body?: string) {
  const message = `${chalk.reset.inverse.bold.white(
    ' INFO '
  )} ${chalk.bold.white(title)}`;
  return e2eConsoleLogger(message, body);
}

export function logSuccess(title: string, body?: string) {
  const message = `${chalk.reset.inverse.bold.green(
    ' SUCCESS '
  )} ${chalk.bold.green(title)}`;
  return e2eConsoleLogger(message, body);
}

export function logError(title: string, body?: string) {
  const message = `${chalk.reset.inverse.bold.red(' ERROR ')} ${chalk.bold.red(
    title
  )}`;
  return e2eConsoleLogger(message, body);
}

export async function killPorts(port?: number): Promise<boolean> {
  return port
    ? await killPort(port)
    : (await killPort(3333)) && (await killPort(4200));
}

export const promisifiedTreeKill: (
  pid: number,
  signal: string
) => Promise<void> = promisify(treeKill);

export function checkFilesDoNotExist(...expectedFiles: string[]) {
  expectedFiles.forEach((f) => {
    const ff = f.startsWith('/') ? f : tmpProjPath(f);
    if (exists(ff)) {
      throw new Error(`File '${ff}' should not exist`);
    }
  });
}

export const getData = async (port = 8080, path = '') => {
  const response = await axios.get(`http://127.0.0.1:${port}${path}`);
  return { status: response.status, message: response.data };
};

export function patchRootPackageJson(
  npmPackageName: string,
  distAbsolutePath: string
) {
  const path = tmpProjPath('package.json');
  const json = readJsonFile(path);
  json.devDependencies[npmPackageName] = `file:${distAbsolutePath}`;
  writeJsonFile(path, json);
}

export function patchPackageJson(
  pluginDistAbsulutePath: string,
  npmPackageName: string,
  npmPackageDistAbsolutePath: string
) {
  const packageJsonPath = path.join(pluginDistAbsulutePath, 'package.json');
  const json = readJsonFile(packageJsonPath);
  json.dependencies[npmPackageName] = `file:${npmPackageDistAbsolutePath}`;
  writeJsonFile(packageJsonPath, json);
}

/**
 * Run the appropriate package manager install command in the e2e directory
 * @param silent silent output from the install
 */
export function runPackageManagerInstallLinks(silent = true) {
  const install = execSync('npm i --install-links', {
    cwd: tmpProjPath(),
    ...(silent ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
  });
  return install ? install.toString() : '';
}

export function removeTmpFromGitignore() {
  const filePath = `${process.cwd()}/.gitignore`;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const updatedFileContent = fileContent.replace('/tmp', '');
  fs.writeFileSync(filePath, updatedFileContent);
}

export function addTmpToGitignore() {
  const filePath = `${process.cwd()}/.gitignore`;
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const updatedFileContent = fileContent.concat('\n/tmp');
  fs.writeFileSync(filePath, updatedFileContent);
}

export function semver(s: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const regexp = /(\d+).(\d+).(\d+)/;

  const m = s.match(regexp);

  if (!m) {
    throw new Error(`Wrong version ${s}`);
  }

  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

export function ifNextVersionExists() {
  const objStr = execSync('npm view nx dist-tags').toString().trim();

  const jsonStr = objStr
    .replace(/'/g, '"')
    .replace(/(\w+:)|(\w+ :)/g, function (matchedStr: string) {
      return '"' + matchedStr.substring(0, matchedStr.length - 1) + '":';
    });

  const {
    latest,
    next,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    previous,
  }: { latest: string; next: string; previous: string } = JSON.parse(jsonStr);

  const latestVersion: { major: number; minor: number; patch: number } =
    semver(latest);

  const nextVersion: { major: number; minor: number; patch: number } =
    semver(next);

  if (nextVersion.major > latestVersion.major) {
    return true;
  }

  if (
    nextVersion.major === latestVersion.major &&
    nextVersion.minor > latestVersion.minor
  ) {
    return true;
  }

  if (
    nextVersion.major === latestVersion.major &&
    nextVersion.minor === latestVersion.minor &&
    nextVersion.patch > latestVersion.patch
  ) {
    return true;
  }

  return false;
}
