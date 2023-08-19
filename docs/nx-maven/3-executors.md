# Executors

## NX_MAVEN_CLI_OPTS env var

To pass Arguments to the maven cli in a global mode, you can use the env var NX_MAVEN_CLI_OPTS.

### Usage

```bash
$env:NX_MAVEN_CLI_OPTS='--batch-mode'
```

## @jnxplus/nx-maven:build

Build a Spring Boot project:

- Build an application:
  We use the Spring Boot `spring-boot:repackage` goal to build the application.

- Build a library:
  For libraries we use `install` goal for build.

In both cases, the build command will not execute tests, and you need to run the test command instead.

### Usage

```bash
nx build my-project-name
```

### Options

#### mvnArgs

Type: `string`

Arguments to pass to the maven cli.

```bash
nx build my-app-name --mvnArgs="--no-transfer-progress"
```

## @jnxplus/nx-maven:build-image

Build a Spring Boot image

### Usage

```bash
nx build-image my-app-name
```

## @jnxplus/nx-maven:serve

Starts server for application.
Under the hood, we use the Spring Boot `spring-boot:run` goal to run the application.

### Usage

```bash
nx serve my-app-name
```

### Options

#### args

Type: `string`

Add more arguments to Maven when serving an app.

```bash
nx serve my-app-name --args="-Dspring-boot.run.profiles=dev"
```

## @jnxplus/nx-maven:test

Test a project.

### Usage

```bash
nx test my-project-name
```

### Options

#### mvnArgs

Type: `string`

Arguments to pass to the maven cli.

```bash
nx test my-app-name --mvnArgs="Your Args"
```

## @jnxplus/nx-maven:lint

Lint a project.

### Usage

```bash
nx lint my-project-name
```

### Options

#### linter (_**required**_)

Default: `chechstyle` for java projects and `ktlint` for kotlin projects

Type: `string`

Possible values: `chechstyle`, `pmd`, `ktlint`

The tool to use for running lint checks.

### Override rules

Under the hood we use [checkstyle](https://checkstyle.sourceforge.io/), [pmd](https://pmd.github.io/) and [ktlint](https://ktlint.github.io/) to perform linting.
To override rules, please use the files `checkstyle.xml` and `pmd.xml` located under the tools/linters folder.

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

## Ktformat

For Kotlin projects please use ktformat executor that uses ktlint.

### Usage

```bash
nx ktformat my-project-name
```

## Kformat (Deprecated)

For Kotlin projects please use kformat executor that uses ktlint.

### Usage

```bash
nx kformat my-project-name
```

## @jnxplus/nx-maven:run-task

Run a custom maven task

### Usage

```bash
nx run-task my-app-name --task="clean install -DskipTests=true"
```
