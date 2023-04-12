package <%= packageName %>

import javax.enterprise.context.ApplicationScoped

@ApplicationScoped
class GreetingService  {

    fun greeting():String {
        return "Hello World!"
    }
}
