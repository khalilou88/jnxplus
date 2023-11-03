# Executors

## @jnxplus/nx-gradle:run-task

Run a custom gradle task

### Usage

```bash
nx run-task my-app-name --task="test"
```

## Format

`@jnxplus/nx-gradle` support out of the box `format` command for java projects to check for or overwrite un-formatted files.
Under the hood we use [prettier-plugin-java](https://www.npmjs.com/package/prettier-plugin-java)

### Usage

- Check for un-formatted files:

```bash
nx format:check
```

- Overwrite un-formatted files:

```bash
nx format:write
```

For more information, please check the Nx documentation.

## @jnxplus/nx-gradle:quarkus-build-image

Build a Spring Boot image

### Usage

```bash
nx build-image my-app-name
```
