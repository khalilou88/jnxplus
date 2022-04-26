# @jnxplus/nx-boot-maven

[![npm version](https://badge.fury.io/js/@jnxplus%2Fnx-boot-maven.svg)](https://badge.fury.io/js/@jnxplus%2Fnx-boot-maven)

This plugin add Spring Boot and Maven multi-module capabilities to Nx workspace.

This is a quick overview of the plugin, to know more, please viste [the documentation](https://khalilou88.github.io/jnxplus/).

## Nx supported versions

The supported versions are:

| @jnxplus/nx-boot-maven | Nx     |
| ---------------------- | ------ |
| 2.x.x                  | 14.x.x |
| 1.x.x                  | 13.x.x |
| 0.x.x                  | 12.x.x |

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-boot-maven` requires a Java 8 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the Nx workspace root folder, run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-boot-maven
```

### 2. Add Spring boot and Maven wrapper support

The following command adds Spring boot and Maven support (Maven wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-boot-maven:init
```

### 3. Usage

| Action                               | Command                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| Generate an application              | `nx generate @jnxplus/nx-boot-maven:application my-app-name` |
| Generate a library                   | `nx generate @jnxplus/nx-boot-maven:library my-lib-name`     |
| Build a project                      | `nx build my-project-name`                                   |
| Serve an application                 | `nx serve my-app-name`                                       |
| Test a project                       | `nx test my-project-name`                                    |
| Lint a project                       | `nx lint my-project-name`                                    |
| Format a java project                | `nx format --projects my-project-name`                       |
| Format a kotlin project              | `nx kformat my-project-name`                                 |
| Visualize project's dependency graph | `nx dep-graph`                                               |

## License

MIT © 2021 Khalil LAGRIDA
