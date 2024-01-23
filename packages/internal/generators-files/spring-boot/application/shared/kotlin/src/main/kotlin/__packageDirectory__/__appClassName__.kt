package <%= packageName %>

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication<% if(!minimal) { %>(scanBasePackages = arrayOf("<%= basePackage %>"))<% } %>
class <%= appClassName %>

fun main(args: Array<String>) {
  runApplication<<%= appClassName %>>(*args)
}


