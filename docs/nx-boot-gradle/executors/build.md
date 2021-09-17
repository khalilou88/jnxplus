# @jnxplus/nx-boot-gradle:build

Build a Spring Boot project.

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
