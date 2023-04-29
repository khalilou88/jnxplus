# @jnxplus/nx-boot-maven:init

Add Spring Boot and Maven support. This only needs to be performed once per workspace.

## Usage

```bash
nx generate @jnxplus/nx-boot-maven:init
```

Or

```bash
nx g @jnxplus/nx-boot-maven:init
```

Show what will be generated without writing to disk:

```bash
nx g @jnxplus/nx-boot-maven:init --dry-run
```

## Options

### javaVersion (_**required**_)

Default: `17`

Type: `string`

Possible values: `17`, `19`

The java version for Spring Boot apps and libs. The same java version is used inside the Nx workspace.

### groupId (_**required**_)

Default: `com.example`

Type: `string`

The parent project groupId.

### parentProjectName (_**required**_)

Default: `boot-multi-module`

Type: `string`

The parent project name.

### parentProjectVersion (_**required**_)

Default: `0.0.1-SNAPSHOT`

Type: `string`

The parent project version.
