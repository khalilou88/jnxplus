package <%= packageName %>

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = arrayOf("<%= groupId %>"))
class <%= appClassName %>

fun main(args: Array<String>) {
  runApplication<<%= appClassName %>>(*args)
}


