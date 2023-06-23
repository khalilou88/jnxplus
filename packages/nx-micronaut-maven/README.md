# @jnxplus/nx-micronaut-maven

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-micronaut-maven.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-micronaut-maven)

This plugin adds Micronaut and Maven multi-module capabilities to Nx workspace.

## Supported versions

| @jnxplus/nx-micronaut-maven | Nx     | Micronaut |
| --------------------------- | ------ | --------- |
| 0.x.x                       | 16.x.x | 4.x.x     |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-micronaut-maven` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-micronaut-maven
```

### 2. Add Micronaut and Maven wrapper support

The following command adds Micronaut and Maven support (Maven wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-micronaut-maven:init
```

### 3. Usage

| Action                               | Command                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------- |
| Generate an application              | `nx generate @jnxplus/nx-micronaut-maven:application my-app-name`          |
| Generate a library                   | `nx generate @jnxplus/nx-micronaut-maven:library my-lib-name`              |
| Generate a parent project            | `nx generate @jnxplus/nx-micronaut-maven:parent-project my-parent-project` |
| Build a project                      | `nx build my-project-name`                                                 |
| Build an image                       | `nx build-image my-app-name`                                               |
| Serve an application                 | `nx serve my-app-name`                                                     |
| Test a project                       | `nx test my-project-name`                                                  |
| Integration Test an application      | `nx integration-test my-app-name`                                          |
| Lint a project                       | `nx lint my-project-name`                                                  |
| Format a java project                | `nx format --projects my-project-name`                                     |
| Format a kotlin project              | `nx ktformat my-project-name`                                              |
| Run a custom task                    | `nx run-task my-project-name --task="clean install -DskipTests=true"`      |
| Publish a project                    | `nx publish my-project-name`                                               |
| Visualize project's dependency graph | `nx graph`                                                                 |

## License

MIT © 2023-2023 Khalil LAGRIDA
