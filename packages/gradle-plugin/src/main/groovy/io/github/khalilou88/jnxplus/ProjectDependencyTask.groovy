package io.github.khalilou88.jnxplus

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.DefaultTask
import org.gradle.api.Project
import org.gradle.api.artifacts.Dependency
import org.gradle.api.artifacts.ProjectDependency
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.options.Option


abstract class ProjectDependencyTask extends DefaultTask {

  @Option(option = "outputFile", description = "Output file")
  @Input
  abstract Property<String> getOutputFile()

  @TaskAction
  void runTask() {
    println("Task ran for projectDependencyTask")
    def projects = []

    addProjects(projects, '', project)


    def result = [
      pluginVersion:
        project.properties["version"],
      projects     :
        projects
    ]

    def json_str = JsonOutput.toJson(result)
    def json_pretty = JsonOutput.prettyPrint(json_str)

    //write file
    def file = new File(getOutputFile().get())
    file.write(json_pretty)
  }

  def addProjects(projects, String parentProjectName, Project currentProject) {


    boolean isBuildGradleExists = currentProject.file('build.gradle').exists()
    boolean isBuildGradleKtsExists = currentProject.file('build.gradle.kts').exists()


    if (isBuildGradleExists || isBuildGradleKtsExists) {
      String projectName = currentProject.name

      boolean isSettingsGradleExists = currentProject.file('settings.gradle').exists()
      boolean isSettingsGradleKtsExists = currentProject.file('settings.gradle.kts').exists()
      File projectJsonFile = currentProject.file('project.json')

      boolean isProjectJsonExists = projectJsonFile.exists()
      if (isProjectJsonExists) {
        def projectJson = new JsonSlurper().parse(projectJsonFile)
        projectName = projectJson.name
      }


      def dependencies = currentProject.configurations
        .findAll { it.allDependencies }
        .collectMany { it.dependencies }
        .findAll { it instanceof ProjectDependency }
        .collect { Dependency element ->
          {
            element = (ProjectDependency) element

            String projectDependencyName = element.name
            File projectDependencyJsonFile = element.dependencyProject.file('project.json')
            boolean isProjectDependencyJsonExists = projectDependencyJsonFile.exists()

            if (isProjectDependencyJsonExists) {
              def projectDependencyJson = new JsonSlurper().parse(projectDependencyJsonFile)
              projectDependencyName = projectDependencyJson.name
            }

            return [relativePath       : currentProject.rootProject.relativePath(element.dependencyProject.projectDir),
                    name               : projectDependencyName,
                    isProjectJsonExists: isProjectDependencyJsonExists,
                    isBuildGradleExists: element.dependencyProject.file('build.gradle').exists()]
          }
        }


      projects.add([relativePath             : currentProject.rootProject.relativePath(currentProject.projectDir),
                    name                     : projectName,
                    isProjectJsonExists      : isProjectJsonExists,
                    isBuildGradleExists      : isBuildGradleExists,
                    isBuildGradleKtsExists   : isBuildGradleKtsExists,
                    isSettingsGradleExists   : isSettingsGradleExists,
                    isSettingsGradleKtsExists: isSettingsGradleKtsExists,
                    isGradlePropertiesExists : currentProject.file('gradle.properties').exists(),
                    parentProjectName        : parentProjectName,
                    dependencies             : dependencies])


      if (isSettingsGradleExists || isSettingsGradleKtsExists) {
        parentProjectName = projectName
      }

    }

    currentProject.childProjects.each { name, childProject ->
      {
        addProjects(projects, parentProjectName, childProject)
      }
    }
  }


}
