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
  console.log(args);

  let javaVersion = '';
  if (!args['javaVersion']) {
    javaVersion = (
      await prompt<{ javaVersion: '17' | '21' }>({
        name: 'javaVersion',
        message: 'Which version of Java would you like to use?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: '17' as any,
        type: 'autocomplete',
        choices: [
          { name: '17', message: '17' },
          { name: '21', message: '21' },
        ],
      })
    ).javaVersion;
  }

  let dsl = '';
  if (!args['dsl']) {
    dsl = (
      await prompt<{ dsl: 'groovy' | 'kotlin' }>({
        name: 'dsl',
        message: 'Which build DSL would you like to use?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'groovy' as any,
        type: 'autocomplete',
        choices: [
          { name: 'groovy', message: 'Groovy build DSL' },
          { name: 'kotlin', message: 'Kotlin build DSL' },
        ],
      })
    ).dsl;
  }

  let rootProjectName = '';
  if (!args['rootProjectName']) {
    rootProjectName = (
      await prompt<{ rootProjectName: string }>({
        type: 'input',
        name: 'rootProjectName',
        message: 'What rootProjectName would you like to use?',
      })
    ).rootProjectName;
  }

  let gradleRootDirectory = '';
  if (!args['gradleRootDirectory']) {
    gradleRootDirectory = (
      await prompt<{ gradleRootDirectory: string }>({
        type: 'input',
        name: 'gradleRootDirectory',
        message:
          'Where do you want Gradle Wrapper (if not skipped), config files and projects to be placed?',
      })
    ).gradleRootDirectory;
  }

  let preset = '';
  if (!args['preset']) {
    preset = (
      await prompt<{
        preset:
          | 'spring-boot'
          | 'quarkus'
          | 'micronaut'
          | 'kotlin-multiplatform'
          | 'none';
      }>({
        name: 'preset',
        message: "Which preset to use? or 'none' to skip.",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'spring-boot' as any,
        type: 'autocomplete',
        choices: [
          { name: 'spring-boot', message: 'spring-boot' },
          { name: 'quarkus', message: 'quarkus' },
          { name: 'micronaut', message: 'micronaut' },
          { name: 'kotlin-multiplatform', message: 'kotlin-multiplatform' },
          { name: 'none', message: 'none' },
        ],
      })
    ).preset;
  }

  console.log(`Creating the workspace: ${name}`);

  // This assumes "@jnxplus/nx-gradle" and "create-nx-gradle-workspace" are at the same version
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const presetVersion = require('../package.json').version;

  const { directory } = await createWorkspace(
    `@jnxplus/nx-gradle@${presetVersion}`,
    {
      name,
      nxCloud: false,
      packageManager: 'npm',
      //init generator
      javaVersion,
      dsl,
      rootProjectName,
      gradleRootDirectory,
      preset,
      skipWrapper: false,
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
