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

  const args = yargs.argv;

  let aggregatorProjectGroupId = args['aggregatorProjectGroupId'];
  if (!aggregatorProjectGroupId) {
    aggregatorProjectGroupId = (
      await prompt<{ aggregatorProjectGroupId: string }>({
        type: 'input',
        name: 'aggregatorProjectGroupId',
        message:
          'What groupId would you like to use for root aggregator project?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'com.example' as any,
      })
    ).aggregatorProjectGroupId;
  }

  let aggregatorProjectName = args['aggregatorProjectName'];
  if (!aggregatorProjectName) {
    aggregatorProjectName = (
      await prompt<{ aggregatorProjectName: string }>({
        type: 'input',
        name: 'aggregatorProjectName',
        message: 'What name would you like to use for root aggregator project?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'root-aggregator-project' as any,
      })
    ).aggregatorProjectName;
  }

  let aggregatorProjectVersion = args['aggregatorProjectVersion'];
  if (!aggregatorProjectVersion) {
    aggregatorProjectVersion = (
      await prompt<{ aggregatorProjectVersion: string }>({
        type: 'input',
        name: 'aggregatorProjectVersion',
        message:
          'What version would you like to use for root aggregator project?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: '0.0.1-SNAPSHOT' as any,
      })
    ).aggregatorProjectVersion;
  }

  let mavenRootDirectory = args['mavenRootDirectory'];
  if (!mavenRootDirectory) {
    mavenRootDirectory = (
      await prompt<{ mavenRootDirectory: string }>({
        type: 'input',
        name: 'mavenRootDirectory',
        message:
          'Where do you want Maven Wrapper (if not skipped), config files and projects to be placed?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: '' as any,
      })
    ).mavenRootDirectory;
  }

  console.log(`Creating the workspace: ${name}`);

  // This assumes "@jnxplus/nx-maven" and "create-nx-maven-workspace" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version;

  console.log(`Using version v${presetVersion} of nx-maven`);

  const { directory } = await createWorkspace(
    `@jnxplus/nx-maven@${presetVersion}`,
    {
      name,
      nxCloud: 'skip',
      packageManager: 'npm',
      //init generator
      aggregatorProjectGroupId,
      aggregatorProjectName,
      aggregatorProjectVersion,
      mavenRootDirectory,
      skipWrapper: false,
      localRepoRelativePath: '.m2/repository',
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
