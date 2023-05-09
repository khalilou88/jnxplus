# Format

`@jnxplus/nx-boot-maven` support out of the box `format` command for java projects to check for or overwrite un-formatted files.
Under the hood we use [prettier-plugin-java](https://www.npmjs.com/package/prettier-plugin-java)

## Usage

- Check for un-formatted files:

```bash
nx format:check
```

- Overwrite un-formatted files:

```bash
nx format:write
```

For more information, please check the Nx documentation.

# Ktformat

For Kotlin projects please use ktformat executor that uses ktlint.

## Usage

```bash
nx ktformat my-project-name
```

# Kformat (Deprecated)

For Kotlin projects please use kformat executor that uses ktlint.

## Usage

```bash
nx kformat my-project-name
```
