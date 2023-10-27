#!/usr/bin/env node

import { createWorkspace } from 'create-nx-workspace';
import { prompt } from 'enquirer';

async function main() {
  let name = process.argv[2];
  if (!name) {
    const response = await prompt<{ name: string }>({
      type: 'input',
      name: 'name',
      message: 'What is the name of the workspace?',
    });
    name = response.name;
  }

  console.log(`Creating the workspace: ${name}`);

  // This assumes "@jnxplus/nx-maven" and "create-nx-maven-workspace" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version;

  // TODO: update below to customize the workspace
  const { directory } = await createWorkspace(
    `@jnxplus/nx-maven@${presetVersion}`,
    {
      name,
      nxCloud: false,
      packageManager: 'npm',
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
