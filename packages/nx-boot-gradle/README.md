# @jnxplus/nx-boot-gradle

This plugin add Spring Boot and Gradle multi-project builds capabilities to Nx workspace.

This is a quick overview of the plugin, to know more, please viste [the documentation](https://khalilou88.github.io/jnxplus/).

## Getting Started

### 0. Prerequisites

`@jnxplus/nx-boot-gradle` requires a Java 8 or higher Runtime Environment and the current Long Term Support (LTS) version of node.js.

### 1. Install the plugin

In the workspace root run this command to install the plugin :

```bash
npm install --save-dev @jnxplus/nx-boot-gradle
```

### 2. Add Spring boot and Gradle wrapper support

The following command adds Spring boot and Gradle support (Gradle wrapper and config files) to the workspace. This only needs to be performed once per workspace.

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

### 3. Usage

| Action                               | Command                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| Generate an application              | `nx generate @jnxplus/nx-boot-gradle:application my-app-name` |
| Generate a library                   | `nx generate @jnxplus/nx-boot-gradle:library my-lib-name`     |
| Build a project                      | `nx build my-project-name`                                    |
| Serve an application                 | `nx serve my-app-name`                                        |
| Test a project                       | `nx test my-project-name`                                     |
| Lint a project                       | `nx lint my-project-name`                                     |
| Format a project                     | `nx format --projects my-project-name`                        |
| Visualize project's dependency graph | `nx dep-graph`                                                |

## License

MIT © 2021 Khalil
