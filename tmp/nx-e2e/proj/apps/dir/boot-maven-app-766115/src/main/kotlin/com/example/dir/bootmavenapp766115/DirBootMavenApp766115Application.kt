package com.example.dir.bootmavenapp766115

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class DirBootMavenApp766115Application

fun main(args: Array<String>) {
  runApplication<DirBootMavenApp766115Application>(*args)
}


