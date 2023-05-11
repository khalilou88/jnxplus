# @jnxplus/nx-quarkus-gradle

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-quarkus-gradle.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-quarkus-gradle)

This plugin adds Quarkus and Gradle multi-project builds capabilities to Nx workspace.

Here is a quick overview of the plugin, to know more, please visit [the documentation](https://khalilou88.github.io/jnxplus/).

## Supported versions

| @jnxplus/nx-quarkus-gradle | Nx     | Quarkus      |
| -------------------------- | ------ | ------------ |
| 0.1.x                      | 16.x.x | 2.16.6.Final |
| 0.0.x                      | 15.x.x | 2.16.6.Final |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-quarkus-gradle` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-quarkus-gradle
```

### 2. Add Quarkus and Gradle wrapper support

The following command adds Quarkus and Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-quarkus-gradle:init
```

### 3. Usage

| Action                               | Command                                                          |
| ------------------------------------ | ---------------------------------------------------------------- |
| Generate an application              | `nx generate @jnxplus/nx-quarkus-gradle:application my-app-name` |
| Generate a library                   | `nx generate @jnxplus/nx-quarkus-gradle:library my-lib-name`     |
| Build a project                      | `nx build my-project-name`                                       |
| Build an image                       | `nx build-image my-app-name`                                     |
| Serve an application                 | `nx serve my-app-name`                                           |
| Test a project                       | `nx test my-project-name`                                        |
| Integration Test an application      | `nx integration-test my-app-name`                                |
| Lint a project                       | `nx lint my-project-name`                                        |
| Format a java project                | `nx format --projects my-project-name`                           |
| Format a kotlin project              | `nx ktformat my-project-name`                                    |
| Run a custom task                    | `nx run-task my-project-name --task="test"`                      |
| Visualize project's dependency graph | `nx dep-graph`                                                   |

## License

MIT © 2023-2023 Khalil LAGRIDA
