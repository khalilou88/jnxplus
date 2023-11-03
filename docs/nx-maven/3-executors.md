# Env vars

## NX_MAVEN_CLI_OPTS env var

To pass Arguments to the maven cli in a global mode, you can use the env var NX_MAVEN_CLI_OPTS.

### Usage

```bash
$env:NX_MAVEN_CLI_OPTS='--batch-mode'
```

# Executors

## @jnxplus/nx-maven:run-task

Run a custom maven task

### Usage

```bash
nx run-task my-app-name --task="clean install -DskipTests=true"
```

## Format

`@jnxplus/nx-maven` support out of the box `format` command for java projects to check for or overwrite un-formatted files.
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

## @jnxplus/nx-maven:quarkus-build-image

Build a Spring Boot image

### Usage

```bash
nx build-image my-app-name
```
