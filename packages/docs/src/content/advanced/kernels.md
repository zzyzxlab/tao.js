# Instantiating Kernels

The TAO that is imported in all tao.js applications is itself the default
Kernel instantiation.  This makes the API easier to use and understand as
well as ensure that all Application Contexts and handlers are working in the
same TAO Space.

Although it's not desired, with Advanced Use Cases, you may find yourself in
need of creating more than one Kernel for an Application, so we document how
to do that here.

Also, don't worry about the overhead of the TAO default Kernel creation if it
isn't used.  The initial data structure is very small and doesn't provide any
overhead until taoples and handlers are added.
