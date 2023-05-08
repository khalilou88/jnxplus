package com.example.bootmavenapp9276178

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class BootMavenApp9276178Application

fun main(args: Array<String>) {
  runApplication<BootMavenApp9276178Application>(*args)
}


