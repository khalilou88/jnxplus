# @jnxplus/nx-boot-gradle

This plugin add Spring Boot and Gradle multi-project builds capabilities to Nx workspace.

## Getting Started

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

| Action                  | Command                                                  |
| ----------------------- | -------------------------------------------------------- |
| Generate an application | `nx generate @jnxplus/nx-boot-gradle:application my-app` |
| Build an application    | `nx build my-app`                                        |
| Test an application     | `nx test my-app`                                         |
| Serve an application    | `nx serve my-app`                                        |
| Generate a library      | `nx generate @jnxplus/nx-boot-gradle:library my-lib`     |
| Build a library         | `nx build my-lib`                                        |
| Test a library          | `nx test my-lib`                                         |

## License

MIT © 2021 Khalil
