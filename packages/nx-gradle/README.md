# @jnxplus/nx-gradle

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-gradle.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-gradle)

This plugin adds Gradle multi-project builds capabilities to Nx workspace.

## Supported versions

| @jnxplus/nx-gradle | Nx       | Spring Boot | Quarkus | Micronaut |
| ------------------ | -------- | ----------- | ------- | --------- |
| 0.x.x              | >=17.x.x | 3.x.x       | 3.x.x   | 4.x.x     |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-gradle` requires a Java 17 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-gradle
```

### 2. Init workspace with Gradle and desired framework support

The following command adds Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-gradle:init
```

Use preset option to choose between Spring Boot, Quarkus, Micronaut, and Kotlin Multiplatform.

### 3. Usage

| Action                                  | Command                                             |
| --------------------------------------- | --------------------------------------------------- |
| Generate an application                 | `nx generate @jnxplus/nx-gradle:application my-app` |
| Generate a library                      | `nx generate @jnxplus/nx-gradle:library my-lib`     |
| Scaffold a kotlin multiplatform project | `nx generate @jnxplus/nx-gradle:kmp my-kmp-project` |
| Build a project                         | `nx build my-project`                               |
| Serve an application                    | `nx serve my-app`                                   |
| Test a project                          | `nx test my-project`                                |
| Format a java project                   | `nx format --projects my-project`                   |
| Visualize project's dependency graph    | `nx graph`                                          |

## License

MIT © 2021-2024 Khalil LAGRIDA
