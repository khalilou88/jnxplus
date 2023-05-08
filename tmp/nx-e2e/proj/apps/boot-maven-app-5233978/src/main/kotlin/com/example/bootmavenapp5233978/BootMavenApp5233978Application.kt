package com.example.bootmavenapp5233978

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("com.example"))
class BootMavenApp5233978Application

fun main(args: Array<String>) {
  runApplication<BootMavenApp5233978Application>(*args)
}


