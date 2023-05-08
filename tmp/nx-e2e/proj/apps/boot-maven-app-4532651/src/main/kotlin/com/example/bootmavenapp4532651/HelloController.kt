package com.example.bootmavenapp4532651
import com.example.bootmavenlib495386.HelloService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HelloController(@Autowired val helloService: HelloService) {

  @GetMapping("/")
  fun greeting(): String = helloService.message()
}
