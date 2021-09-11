# nx-boot-gradle

This plugin was generated with [Nx](https://nx.dev).

## Add Spring boot and Gradle capabilities to your workspace

```bash
npm install --save-dev @jnxplus/nx-boot-gradle
```

## Add Spring boot and Gradle support to the workspace

The following command adds Spring boot and Gradle support to the workspace. This only needs to be performed once per workspace. You can skip this step if Spring boot and Gradle are already added to the workspace.

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

## Generate an application

Run this command to generate an application :

```bash
nx generate @jnxplus/nx-boot-gradle:application my-app
```

## Generate a library

Run this command to generate a library :

```bash
nx generate @jnxplus/nx-boot-gradle:library my-lib
```

## Running unit tests

Run `nx test nx-boot-gradle` to execute the unit tests via [Jest](https://jestjs.io).
