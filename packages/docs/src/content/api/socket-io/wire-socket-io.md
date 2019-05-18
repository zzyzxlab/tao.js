# wireTaoJsToSocketIO

**Package:** `@tao.js/socket.io`

**Default Export:**

`wireTaoJsToSocketIO` is the _default_ and _only_ export of the `@tao.js/socket.io` package.

`wireTaoJsToSocketID` is a Function used to wire a socket.io Socket on both the server and client
to the TAO in order to extend the TAO from from the client to the server.

## Function Args

### Server-side

|arg|required|type|default|description|
|---|---|---|---|---|
|`TAO`|yes|Kernel|||
|`io`|yes||||
|`opts`|no|Object|`{}`|provide options to…|

**no return**

does not return anything

### Client-side

|arg|required|type|default|description|
|---|---|---|---|---|
|`TAO`|yes|Kernel|||
|`io`|yes||||
|`opts`|no|Object|`{}`|provide options to…|

**returns:** `Socket` - a new socket.io Socket that is decorated to share all AppCons set on the
TAO Kernel to the server

Will return nothing if the `io` argument is not provided as a function
