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

  let dependencyManagement = args['dependencyManagement'];
  if (!dependencyManagement) {
    dependencyManagement = (
      await prompt<{
        dependencyManagement: DependencyManagementType;
      }>({
        name: 'dependencyManagement',
        message: 'How to manage dependencies?',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial: 'none' as any,
        type: 'autocomplete',
        choices: [
          {
            name: 'none',
            message:
              'I will generate later a parent project and keep the root project for modules aggregation',
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

  console.log(`Using version v${presetVersion} of nx-maven`);

  const { directory } = await createWorkspace(
    `@jnxplus/nx-maven@${presetVersion}`,
    {
      name,
      nxCloud: 'skip',
      packageManager: 'npm',
      //init generator
      javaVersion,
      aggregatorProjectGroupId,
      aggregatorProjectName,
      aggregatorProjectVersion,
      mavenRootDirectory,
      dependencyManagement,
      skipWrapper: false,
      localRepoRelativePath: '.m2/repository',
    },
  );

  console.log(`Successfully created the workspace: ${directory}.`);
}

main();
