package com.example.bootmavenlib1416264

import org.springframework.stereotype.Service

@Service
class HelloService {

  fun message(): String {
    return "Hello World!"
  }
}
