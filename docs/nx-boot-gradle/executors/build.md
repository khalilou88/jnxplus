# @jnxplus/nx-boot-gradle:build

Build a Spring Boot project:

- Build an application:
  Depending on the packaging option, under the hood, we use the Spring Boot `bootJar` or `bootWar` tasks to build the application.

- Build a library:
  For libraries we use always the `jar` task for build.

In both cases, the build command will not execute tests and you need to run the test command instead.

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
