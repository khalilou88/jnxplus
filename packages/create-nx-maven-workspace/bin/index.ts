#!/usr/bin/env node

import { createWorkspace } from 'create-nx-workspace';
import { prompt } from 'enquirer';
import * as yargs from 'yargs';

async function main() {
  let name = process.argv[2];
  if (!name) {
    name = (
      await prompt<{ name: string }>({
        type: 'input',
        name: 'name',
        message: 'What is the name of the workspace?',
      })
    ).name;
  }

  const argsString = process.argv[3];
  const args = yargs.parse(argsString);
  console.log(args);

  let mode = '';
  if (!args['mode']) {
    mode = (
      await prompt<{ mode: 'light' | 'dark' }>({
        name: 'mode',
        message: 'Which mode to use',
        initial: 'dark' as any,
        type: 'autocomplete',
        choices: [
          { name: 'light', message: 'light' },
          { name: 'dark', message: 'dark' },
        ],
      })
    ).mode;
  }
  console.log(mode);

  console.log(`Creating the workspace: ${name}`);

  // This assumes "@jnxplus/nx-maven" and "create-nx-maven-workspace" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version;

  const { directory } = await createWorkspace(
    `@jnxplus/nx-maven@${presetVersion}`,
    {
      name,
      nxCloud: false,
      packageManager: 'npm',
      //init generator
      javaVersion: '17',
      groupId: 'org.example',
      parentProjectName: name,
      parentProjectVersion: '0.0.0',
      mavenRootDirectory: 'nx-maven',
      dependencyManagement: 'bom',
      skipWrapper: false,
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
