package jnxplus.gradle.plugin

import groovy.json.JsonOutput
import org.gradle.api.DefaultTask
import org.gradle.api.artifacts.ProjectDependency
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.options.Option

abstract class ProjectGraphTask extends DefaultTask {

  @OutputFile
  abstract RegularFileProperty getDestination()

  @Option(option = "outputFile", description = "Output file")
  @Input
  abstract Property<String> getOutputFile()

  @TaskAction
  void runTask() {
    println("Task ran for projectDependencyReport")
    def projects = []

    addProjects(projects, '', project)

    def json_str = JsonOutput.toJson(projects)
    def json_pretty = JsonOutput.prettyPrint(json_str)

    //write file
    def file = getDestination().get().asFile
    file.write(json_pretty)
  }

  def addProjects(projects, parentProjectName, project) {

    def dependencies = project.configurations
      .findAll { it.allDependencies }
      .collectMany { it.dependencies }
      .findAll { it instanceof ProjectDependency }
      .collect { element ->
        return [name               : element.name,
                projectDirPath     : element.dependencyProject.projectDir.path,
                isProjectJsonExists: element.dependencyProject.file('project.json').exists(),
                isBuildGradleExists: element.dependencyProject.file('build.gradle').exists()]
      }

    projects.add([name                     : project.name,
                  isProjectJsonExists      : project.file('project.json').exists(),
                  isBuildGradleExists      : project.file('build.gradle').exists(),
                  isBuildGradleKtsExists   : project.file('build.gradle.kts').exists(),
                  isSettingsGradleExists   : project.file('settings.gradle').exists(),
                  isSettingsGradleKtsExists: project.file('settings.gradle.kts').exists(),
                  isGradlePropertiesExists : project.file('gradle.properties').exists(),
                  projectDirPath           : project.projectDir.path,
                  parentProjectName        : parentProjectName,
                  dependencies             : dependencies]);

    project.childProjects.each { name, childProject ->
      {
        addProjects(projects, project.name, childProject)
      }
    }
  }
}
