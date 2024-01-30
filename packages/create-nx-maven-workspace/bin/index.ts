#!/usr/bin/env node

import { DependencyManagementType } from '@jnxplus/common';
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

  let javaVersion = args['javaVersion'];
  if (!javaVersion) {
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

  let groupId = args['groupId'];
  if (!groupId) {
    groupId = (
      await prompt<{ groupId: string }>({
        type: 'input',
        name: 'groupId',
        message: 'What groupId would you like to use?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'com.example' as any,
      })
    ).groupId;
  }

  let parentProjectName = args['parentProjectName'];
  if (!parentProjectName) {
    parentProjectName = (
      await prompt<{ parentProjectName: string }>({
        type: 'input',
        name: 'parentProjectName',
        message: 'What parentProjectName would you like to use?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'root-parent-project' as any,
      })
    ).parentProjectName;
  }

  let parentProjectVersion = args['parentProjectVersion'];
  if (!parentProjectVersion) {
    parentProjectVersion = (
      await prompt<{ parentProjectVersion: string }>({
        type: 'input',
        name: 'parentProjectVersion',
        message: 'What project version would you like to use?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: '0.0.1-SNAPSHOT' as any,
      })
    ).parentProjectVersion;
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

  let dependencyManagement = args['dependencyManagement'];
  if (!dependencyManagement) {
    dependencyManagement = (
      await prompt<{
        dependencyManagement: DependencyManagementType;
      }>({
        name: 'dependencyManagement',
        message: 'How to manage dependencies?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      nxCloud: 'skip',
      packageManager: 'npm',
      //init generator
      javaVersion,
      groupId,
      parentProjectName,
      parentProjectVersion,
      mavenRootDirectory,
      dependencyManagement,
      skipWrapper: false,
      localRepoRelativePath: '.m2/repository',
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
