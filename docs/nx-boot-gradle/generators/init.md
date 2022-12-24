# @jnxplus/nx-boot-gradle:init

Add Spring Boot and Gradle support. This only needs to be performed once per workspace.

## Usage

```bash
nx generate @jnxplus/nx-boot-gradle:init
```

Or

```bash
nx g @jnxplus/nx-boot-gradle:init
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-gradle:init --dry-run
```

## Options

### javaVersion (_**required**_)

Default: `17`

Type: `string`

Possible values: `17`, `19`

The java version for Spring Boot apps and libs. The same java version is used inside the Nx worspace.

### dsl (_**required**_)

Default: `groovy`

Type: `string`

Possible values: `groovy`, `kotlin`

The Build DSL.

### rootProjectName (_**required**_)

Default: `boot-multi-project`

Type: `string`

The root project name.
