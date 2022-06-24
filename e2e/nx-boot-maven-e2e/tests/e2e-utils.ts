import { getPackageManagerCommand } from '@nrwl/devkit';
import { tmpProjPath } from '@nrwl/nx-plugin/testing';
import { ChildProcess, exec, execSync } from 'child_process';
import * as path from 'path';
import { check as portCheck } from 'tcp-port-used';
import { promisify } from 'util';
import chalk = require('chalk');
import treeKill = require('tree-kill');
const kill = require('kill-port');

export function runNxNewCommand(args?: string, silent?: boolean) {
  const localTmpDir = path.dirname(tmpProjPath());
  return execSync(
    `node ${require.resolve(
      'nx'
    )} new proj --nx-workspace-root=${localTmpDir} --no-interactive --skip-install --collection=@nrwl/workspace --npmScope=proj --preset=empty ${
      args || ''
    }`,
    {
      cwd: localTmpDir,
      ...(silent && false ? { stdio: ['ignore', 'ignore', 'ignore'] } : {}),
    }
  );
}

export function normalizeName(name: string) {
  return name.replace(/[^0-9a-zA-Z]/g, '-');
}

/**
 * Remove log colors for fail proof string search
 * @param log
 * @returns
 */
function stripConsoleColors(log: string): string {
  return log.replace(
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

    function checkCriteria(c) {
      output += c.toString();
      if (criteria(stripConsoleColors(output)) && !complete) {
        complete = true;
        res(p);
      }
    }

    // @ts-ignore: Object is possibly 'null'.
    p.stdout.on('data', checkCriteria);
    // @ts-ignore: Object is possibly 'null'.
    p.stderr.on('data', checkCriteria);
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
