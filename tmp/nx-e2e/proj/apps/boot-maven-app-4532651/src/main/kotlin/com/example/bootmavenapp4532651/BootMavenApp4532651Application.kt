package com.example.bootmavenapp4532651

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class BootMavenApp4532651Application

fun main(args: Array<String>) {
  runApplication<BootMavenApp4532651Application>(*args)
}
