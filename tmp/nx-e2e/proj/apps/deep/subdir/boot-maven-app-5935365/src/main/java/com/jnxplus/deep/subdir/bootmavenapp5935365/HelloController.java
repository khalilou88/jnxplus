package com.jnxplus.deep.subdir.bootmavenapp5935365;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

  @GetMapping("/")
  public String greeting() {
    return "Hello World!";
  }
}
