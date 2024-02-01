package io.github.khalilou88.jnxplus

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.DefaultTask
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

    addProjects(project, projects, '', project)

    def json_str = JsonOutput.toJson(projects)
    def json_pretty = JsonOutput.prettyPrint(json_str)

    //write file
    def file = new File(getOutputFile().get())
    file.write(json_pretty)
  }

  def addProjects(rootProject, projects, parentProjectName, currentProject) {

    def isBuildGradleExists = currentProject.file('build.gradle').exists()
    def isBuildGradleKtsExists = currentProject.file('build.gradle.kts').exists()

    if (isBuildGradleExists == true || isBuildGradleKtsExists == true) {


      def projectName = currentProject.name
      def isProjectJsonExists = currentProject.file('project.json').exists()
      if (isProjectJsonExists == true) {
        def projectJson = new JsonSlurper().parseFile(currentProject.file('project.json'))
        projectName = projectJson.name
      }


      def dependencies = currentProject.configurations
        .findAll { it.allDependencies }
        .collectMany { it.dependencies }
        .findAll { it instanceof ProjectDependency }
        .collect { element -> return createDep(rootProject, element)
        }


      projects.add([relativePath             : rootProject.relativePath(currentProject.projectDir),
                    name                     : currentProject.name,
                    isProjectJsonExists      : isProjectJsonExists,
                    isBuildGradleExists      : isBuildGradleExists,
                    isBuildGradleKtsExists   : isBuildGradleKtsExists,
                    isSettingsGradleExists   : currentProject.file('settings.gradle').exists(),
                    isSettingsGradleKtsExists: currentProject.file('settings.gradle.kts').exists(),
                    isGradlePropertiesExists : currentProject.file('gradle.properties').exists(),
                    parentProjectName        : parentProjectName,
                    dependencies             : dependencies]);

    }

    currentProject.childProjects.each { name, childProject ->
      {
        addProjects(rootProject, projects, projectName, childProject)
      }
    }
  }

  private LinkedHashMap<String, String> createDep(rootProject, element) {
    def projectName = element.name
    def isProjectJsonExists = element.dependencyProject.file('project.json').exists()


    if (isProjectJsonExists == true) {
      def projectJson = new JsonSlurper().parseFile(element.dependencyProject.file('project.json'))
      projectName = projectJson.name
    }


    [relativePath       : rootProject.relativePath(element.dependencyProject.projectDir),
     name               : projectName,
     isProjectJsonExists: isProjectJsonExists,
     isBuildGradleExists: element.dependencyProject.file('build.gradle').exists()]
  }
}
