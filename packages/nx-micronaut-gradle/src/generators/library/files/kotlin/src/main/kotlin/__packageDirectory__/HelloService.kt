package <%= packageName %>

import jakarta.inject.Singleton

@Singleton
class HelloService  {

  fun greeting():String {
    return "Hello World"
  }
}
