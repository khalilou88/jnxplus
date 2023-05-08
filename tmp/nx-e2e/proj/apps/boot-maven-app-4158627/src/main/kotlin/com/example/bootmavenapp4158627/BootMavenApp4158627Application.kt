package com.example.bootmavenapp4158627

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class BootMavenApp4158627Application

fun main(args: Array<String>) {
  runApplication<BootMavenApp4158627Application>(*args)
}


