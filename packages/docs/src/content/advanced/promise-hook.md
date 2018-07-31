# tao.js Promise Hook

tao.js, as an implementation of the TAO in JavaScript with a goal of being able to
be used everywhere.  In order to provide some of the
integrations with other JavaScript frameworks, there was a need to allow the
same method which sets the Context on the TAO to also receive the downstream affects
that result in order to construct and provide a response to a requestor.

It is not recommended you build apps with the Promise Hook as it was made to provide
a feature for special circumstances in order to convert a Request-Reply paradigm into
a Forward-only Evented paradigm espoused by the TAO.

It's documented here as an Advanced Topic since people may find it within the code and
wonder what to do with it.
