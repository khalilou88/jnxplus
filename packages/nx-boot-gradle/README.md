# nx-boot-gradle

This library was generated with [Nx](https://nx.dev).

## Running unit tests

Run `nx test nx-boot-gradle` to execute the unit tests via [Jest](https://jestjs.io).

## install the plugin

```bash
npm i @jnxplus/nx-boot-gradle
```

## 1. Add Spring boot and gradle support to the workspace

The following command adds Spring boot and Gradle support to the workspace. This only needs to be performed once per workspace. You can skip this step if Spring boot and Gradle are already added to the workspace.

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

```bash
nx generate @jnxplus/nx-boot-gradle:application my-app
```

```bash
nx generate @jnxplus/nx-boot-gradle:library my-lib
```
