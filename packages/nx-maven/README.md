# @jnxplus/nx-maven

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-maven.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-maven)

This plugin adds Maven multi-module capabilities to Nx workspace.

## Supported versions

| @jnxplus/nx-maven | Nx     | Spring Boot | Quarkus     | Micronaut |
| ----------------- | ------ | ----------- | ----------- | --------- |
| 0.x.x             | 16.x.x | 3.x.x       | 3.x.x.Final | 4.x.x     |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-maven` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-maven
```

### 2. Add Maven wrapper support

The following command adds Maven support (Maven wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-maven:init
```

Generate a parent project to add Spring Boot, Quarkus, or Micronaut frameworks.

### 3. Usage

| Action                               | Command                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| Generate a parent project            | `nx generate @jnxplus/nx-maven:parent-project my-parent-project` |
| Generate an application              | `nx generate @jnxplus/nx-maven:application my-app-name`          |
| Generate a library                   | `nx generate @jnxplus/nx-maven:library my-lib-name`              |
| Build a project                      | `nx build my-project-name`                                       |
| Serve an application                 | `nx serve my-app-name`                                           |
| Test a project                       | `nx test my-project-name`                                        |
| Lint a project                       | `nx lint my-project-name`                                        |
| Format a java project                | `nx format --projects my-project-name`                           |
| Format a kotlin project              | `nx ktformat my-project-name`                                    |
| Run a custom task                    | `nx run-task my-project-name --task="MY_CUSTOM_TASK"`            |
| Visualize project's dependency graph | `nx graph`                                                       |

## License

MIT © 2023-2023 Khalil LAGRIDA
