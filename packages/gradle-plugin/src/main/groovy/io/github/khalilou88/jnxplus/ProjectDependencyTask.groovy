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

class GradleProject1Type {

  GradleProject1Type(String relativePath, String name, boolean isProjectJsonExists, boolean isBuildGradleExists) {
    this.relativePath = relativePath
    this.name = name
    this.isProjectJsonExists = isProjectJsonExists
    this.isBuildGradleExists = isBuildGradleExists
  }

  String relativePath
  String name
  boolean isProjectJsonExists
  boolean isBuildGradleExists
}


class GradleProjectType extends GradleProject1Type {

  GradleProjectType(String relativePath, String name, boolean isProjectJsonExists, boolean isBuildGradleExists, boolean isBuildGradleKtsExists, boolean isSettingsGradleExists, boolean isSettingsGradleKtsExists, boolean isGradlePropertiesExists, String parentProjectName, List<GradleProject1Type> dependencies) {
    super(relativePath, name, isProjectJsonExists, isBuildGradleExists)
    this.isBuildGradleKtsExists = isBuildGradleKtsExists
    this.isSettingsGradleExists = isSettingsGradleExists
    this.isSettingsGradleKtsExists = isSettingsGradleKtsExists
    this.isGradlePropertiesExists = isGradlePropertiesExists
    this.parentProjectName = parentProjectName
    this.dependencies = dependencies
  }

  boolean isBuildGradleKtsExists
  boolean isSettingsGradleExists
  boolean isSettingsGradleKtsExists
  boolean isGradlePropertiesExists
  String parentProjectName
  List<GradleProject1Type> dependencies
}

abstract class ProjectDependencyTask extends DefaultTask {

  @Option(option = "outputFile", description = "Output file")
  @Input
  abstract Property<String> getOutputFile()

  @TaskAction
  void runTask() {
    println("Task ran for projectDependencyTask")
    List<GradleProjectType> projects = []

    addProjects(project, projects, '', project)

    def json_str = JsonOutput.toJson(projects)
    def json_pretty = JsonOutput.prettyPrint(json_str)

    //write file
    def file = new File(getOutputFile().get())
    file.write(json_pretty)
  }

  def addProjects(Project rootProject, List<GradleProjectType> projects, String parentProjectName, Project currentProject) {


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


      List<GradleProject1Type> dependencies = currentProject.configurations
        .findAll { it.allDependencies }
        .collectMany { it.dependencies }
        .findAll { it instanceof ProjectDependency }
        .collect { Dependency element ->
          {
            element = (ProjectDependency) element

            String depProjectName = element.name
            File depProjectJsonFile = element.dependencyProject.file('project.json')
            boolean isDepProjectJsonExists = depProjectJsonFile.exists()

            if (isDepProjectJsonExists) {
              def depProjectJson = new JsonSlurper().parse(depProjectJsonFile)
              depProjectName = depProjectJson.name
            }

            return new GradleProject1Type(
              rootProject.relativePath(element.dependencyProject.projectDir),
              depProjectName,
              isDepProjectJsonExists,
              element.dependencyProject.file('build.gradle').exists()
            )
          }
        }


      projects.add(new GradleProjectType(
        rootProject.relativePath(currentProject.projectDir),
        projectName,
        isProjectJsonExists,
        isBuildGradleExists,
        isBuildGradleKtsExists,
        isSettingsGradleExists,
        isSettingsGradleKtsExists,
        currentProject.file('gradle.properties').exists(),
        parentProjectName,
        dependencies)
      )


      if (isSettingsGradleExists || isSettingsGradleKtsExists) {
        parentProjectName = projectName
      }

    }

    currentProject.childProjects.each { name, childProject ->
      {
        addProjects(rootProject, projects, parentProjectName, childProject)
      }
    }
  }


}
