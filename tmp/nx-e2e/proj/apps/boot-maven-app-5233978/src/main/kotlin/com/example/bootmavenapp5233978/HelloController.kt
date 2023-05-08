package com.example.bootmavenapp5233978

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HelloController {

    @GetMapping("/")
    fun greeting():String = "Hello World!"

}
