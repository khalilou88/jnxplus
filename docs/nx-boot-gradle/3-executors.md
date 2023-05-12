# Executors

# @jnxplus/nx-boot-gradle:build

Build a Spring Boot project:

- Build an application:
  Depending on the packaging option, under the hood, we use the Spring Boot `bootJar` or `bootWar` tasks to build the application.

- Build a library:
  For libraries we use always the `jar` task for build.

In both cases, the build command will not execute tests, and you need to run the test command instead.

Options can be configured in `workspace.json` when defining the executor, or when invoking it.
Read more about how to use executors and the CLI here: https://nx.dev/getting-started/nx-cli#common-commands.

## Usage

```bash
nx build my-project-name
```

## Options

### packaging

Default: `jar`

Type: `string`

Possible values: `jar`, `war`

The application packaging. This option is only needed for an application.
The packaging of a lib is always a jar.

## @jnxplus/nx-boot-gradle:build-image

Build a Spring Boot image

### Usage

```bash
nx build-image my-app-name
```

## @jnxplus/nx-boot-gradle:serve

Starts server for application.
Under the hood, we use the Spring Boot `bootRun` task to run the application.

### Usage

```bash
nx serve my-app-name
```

### Options

#### args

Type: `string`

Add more arguments when serving an app.

```bash
nx serve my-app-name --args='--spring.profiles.active=dev'
```

## @jnxplus/nx-boot-gradle:test

Test a project.

### Usage

```bash
nx test my-project-name
```

## @jnxplus/nx-boot-gradle:lint

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

`@jnxplus/nx-boot-gradle` support out of the box `format` command for java projects to check for or overwrite un-formatted files.
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

## @jnxplus/nx-boot-gradle:run-task

Run a custom gradle task

### Usage

```bash
nx run-task my-app-name --task="test"
```
