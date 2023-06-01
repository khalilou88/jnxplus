# @jnxplus/nx-micronaut-gradle

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-micronaut-gradle.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-micronaut-gradle)

This plugin adds Spring micronaut and Gradle multi-project builds capabilities to Nx workspace.

Here is a quick overview of the plugin, to know more, please visit [the documentation](https://khalilou88.github.io/jnxplus/).

## Supported versions

| @jnxplus/nx-micronaut-gradle | Nx     | Spring micronaut |
| ---------------------------- | ------ | ---------------- |
| 6.x.x                        | 16.x.x | 3.x.x            |
| 5.x.x                        | 15.x.x | 3.x.x            |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-micronaut-gradle` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-micronaut-gradle
```

### 2. Add Spring micronaut and Gradle wrapper support

The following command adds Spring micronaut and Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-micronaut-gradle:init
```

### 3. Usage

| Action                               | Command                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| Generate an application              | `nx generate @jnxplus/nx-micronaut-gradle:application my-app-name` |
| Generate a library                   | `nx generate @jnxplus/nx-micronaut-gradle:library my-lib-name`     |
| Build a project                      | `nx build my-project-name`                                         |
| Serve an application                 | `nx serve my-app-name`                                             |
| Test a project                       | `nx test my-project-name`                                          |
| Lint a project                       | `nx lint my-project-name`                                          |
| Format a java project                | `nx format --projects my-project-name`                             |
| Format a kotlin project              | `nx ktformat my-project-name`                                      |
| Run a custom task                    | `nx run-task my-project-name --task="test"`                        |
| Visualize project's dependency graph | `nx dep-graph`                                                     |

## License

MIT © 2023-2023 Khalil LAGRIDA
