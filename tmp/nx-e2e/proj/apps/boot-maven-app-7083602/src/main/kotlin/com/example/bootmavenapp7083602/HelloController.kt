package com.example.bootmavenapp7083602

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HelloController {

  @GetMapping("/")
  fun greeting(): String = "Hello World!"
}
