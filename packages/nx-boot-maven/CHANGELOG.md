# Changelog

# 5.2.2 (2023-04-08)

- Init Generator : Fix when prettierrc and prettierignore don't exist

# 5.2.1 (2023-04-07)

- Fix dep graph when dependencies tag is undefined

# 5.2.0 (2023-04-06)

- Calculate dep graph for all maven projects

# 5.1.1 (2023-04-05)

- Name the exported generators to be able to import them individually

# 5.1.0 (2023-04-05)

- Add run-task executor
- Add exports of all generators to be able to import and extend them
- Update Nx to version 15.8.7

# 5.0.0 (2022-12-25)

- Add Spring Boot 3 support

# 3.1.0 (2022-12-03)

- Update Maven to 3.8.6 version
- Remove dash from packageName when generating apps and libs
- Update Nx to version 15.2.4

# 3.0.0 (2022-11-26)

- Update Nx to version 15
- Add mvnArgs option to pass arguments to the maven cli for build executor

# 2.5.1 (2022-09-20)

- Fix plugin install with better use of peerDependencies and dependencies

# 2.4.1 (2022-08-23)

- Add xmldoc to the plugin deps

# 2.4.0 (2022-08-23)

- Use peerDependencies
- Add packageNameType option to choose between short and long packageName
- Update Nx to latest version (14.5.8)

# 2.3.0 (2022-06-24)

- Run commands from workspace root
- Update Nx

# 2.2.1 (2022-06-14)

- Fix serve app with no args
- Update Nx

# 2.2.0 (2022-06-10)

- Update Nx to version 14.2.4

# 2.1.1 (2022-06-10)

- Fix dep-graph for nx > 14.2.x
- Use patch release for deps

# 2.1.0 (2022-06-08)

- Add args to serve executor
- Update Nx

# 2.0.1 (2022-04-27)

- Update Nx

# 2.0.0 (2022-04-22)

- Upgrade to Nx 14

# 1.6.1 (2022-03-16)

- Init Generator : fix javaVersion type to match string and number

# 1.6.0 (2022-03-14)

- App and lib Generators : Add outputs option to build executor

# 1.5.2 (2022-03-11)

- App Generator : Make serve and test executors depends on build executor

# 1.5.1 (2022-03-10)

- Fix build executor

# 1.5.0 (2022-03-08)

- new build-image executor
- new migrate generator
- Refactor directory option

# 1.3.0 (2022-02-15)

- Update Maven wrapper and spring boot versions

# 1.2.1 (2022-01-31)

- Update lint deps

# 1.2.0 (2022-01-25)

- Fix lint kotlin projects
- Add kformat to format kotlin projects

# 1.1.0 (2022-01-04)

- This release contains some deps update.
- Breaking Changes:  
  We moved spring-boot-starter-parent to the parent POM at the workspace root for better maintenance.

# 1.0.2 (2021-12-24)

This release adds Nx 13 support.  
For Nx 12, use the version < 1.
