package jnxplus.gradle.plugin

import groovy.json.JsonOutput
import org.gradle.api.DefaultTask
import org.gradle.api.artifacts.ProjectDependency
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.options.Option

abstract class ProjectGraphTask extends DefaultTask {

  @Option(option = "outputFile", description = "Output file")
  @Input
  abstract Property<String> getOutputFile()

  @TaskAction
  void runTask() {
    println("Task ran for project graph")
    def projects = []
    addProjects(projects, project)

    def json_str = JsonOutput.toJson(projects)
    def json_pretty = JsonOutput.prettyPrint(json_str)

    //write file
    def file = new File(getOutputFile().get())
    file.write(json_pretty)
  }


  def addProjects(projects, project) {

    def subprojects = project
      .subprojects
      .findAll {
        it.file('build.gradle').exists() || it.file('build.gradle.kts').exists()
      }

    def dependencies = project.configurations
      .findAll { it.allDependencies }
      .collectMany { it.dependencies }
      .findAll { it instanceof ProjectDependency }

    projects.add([name                     : project.name,
                  isProjectJsonExists      : project.file('project.json').exists(),
                  isBuildGradleExists      : project.file('build.gradle').exists(),
                  isBuildGradleKtsExists   : project.file('build.gradle.kts').exists(),
                  isSettingsGradleExists   : project.file('settings.gradle').exists(),
                  isSettingsGradleKtsExists: project.file('settings.gradle.kts').exists(),
                  isGradlePropertiesExists : project.file('gradle.properties').exists(),
                  projectDirPath           : project.projectDir.path,
                  subprojects              : subprojects.collect { element ->
                    return [name               : element.name,
                            projectDirPath     : element.projectDir.path,
                            isProjectJsonExists: element.file('project.json').exists(),
                            isBuildGradleExists: element.file('build.gradle').exists()]
                  },
                  dependencies             : dependencies.collect { element ->
                    return [name               : element.name,
                            projectDirPath     : element.dependencyProject.projectDir.path,
                            isProjectJsonExists: element.dependencyProject.file('project.json').exists(),
                            isBuildGradleExists: element.dependencyProject.file('build.gradle').exists()]
                  }]);

    if (!subprojects) {
      return
    }

    subprojects
      .each { subproject -> addProjects(projects, subproject) }
  }
}
