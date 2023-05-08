package com.example.bootmavenapp9727701;

import com.example.bootmavenlib3433640.HelloService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @Autowired
  private HelloService helloService;

  @GetMapping("/")
  public String greeting() {
    return this.helloService.message();
  }
}
