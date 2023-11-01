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
        initial: '17' as any,
        type: 'autocomplete',
        choices: [
          { name: '17', message: '17' },
          { name: '21', message: '21' },
        ],
      })
    ).javaVersion;
  }

  let groupId = '';
  if (!args['groupId']) {
    groupId = (
      await prompt<{ groupId: string }>({
        type: 'input',
        name: 'groupId',
        message: 'What groupId would you like to use?',
      })
    ).groupId;
  }

  let parentProjectVersion = '';
  if (!args['parentProjectVersion']) {
    parentProjectVersion = (
      await prompt<{ parentProjectVersion: string }>({
        type: 'input',
        name: 'parentProjectVersion',
        message: 'What project version would you like to use?',
      })
    ).parentProjectVersion;
  }

  let mavenRootDirectory = '';
  if (!args['mavenRootDirectory']) {
    mavenRootDirectory = (
      await prompt<{ mavenRootDirectory: string }>({
        type: 'input',
        name: 'mavenRootDirectory',
        message:
          'Where do you want Maven Wrapper (if not skipped), config files and projects to be placed?',
      })
    ).mavenRootDirectory;
  }

  let dependencyManagement = '';
  if (!args['dependencyManagement']) {
    dependencyManagement = (
      await prompt<{
        dependencyManagement:
          | 'bom'
          | 'spring-boot-parent-pom'
          | 'micronaut-parent-pom';
      }>({
        name: 'dependencyManagement',
        message: "Which preset to use? or 'none' to skip.",
        initial: 'bom' as any,
        type: 'autocomplete',
        choices: [
          {
            name: 'bom',
            message:
              'I will generate later a parent project with Maven BOM (Spring Boot, Quarkus or Micronaut)',
          },
          {
            name: 'spring-boot-parent-pom',
            message: 'I want to add Spring Boot parent POM to root POM.xml',
          },
          {
            name: 'micronaut-parent-pom',
            message: 'I want to add Micronaut parent POM to root POM.xml',
          },
        ],
      })
    ).dependencyManagement;
  }

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
      javaVersion,
      groupId,
      parentProjectName: name,
      parentProjectVersion,
      mavenRootDirectory,
      dependencyManagement,
      skipWrapper: false,
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
