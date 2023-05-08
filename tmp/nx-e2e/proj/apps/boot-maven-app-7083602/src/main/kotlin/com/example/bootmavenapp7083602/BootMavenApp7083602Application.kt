package com.example.bootmavenapp7083602

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class BootMavenApp7083602Application

fun main(args: Array<String>) {
  runApplication<BootMavenApp7083602Application>(*args)
}
