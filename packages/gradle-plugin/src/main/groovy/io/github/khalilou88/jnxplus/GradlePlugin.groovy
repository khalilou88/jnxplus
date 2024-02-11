package io.github.khalilou88.jnxplus


import org.gradle.api.Plugin
import org.gradle.api.Project

/**
 * Jnxplus plugin.
 * */
class GradlePlugin implements Plugin<Project> {

  void apply(Project project) {
    // Register a task
    project.tasks.register("projectDependencyTask", ProjectDependencyTask)
  }

}
