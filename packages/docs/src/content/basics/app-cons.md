# Application Contexts (AppCons)

At its core, an Application is a set of [State Machine](https://en.wikipedia.org/wiki/Finite-state_machine)s
consisting of various _States_, _Transitions_ from state to state, and _Rules_ and _Logic_ that
constrain the transitions between states.

# the TAO represent Abstract States

tao.js expresses the Abstract States of an Application through the use of the TAO, previously
written and repeated for clarity as:

**T**erm - the _thing_ in the context - conceptually a domain entity  
**A**ction - the _operation_ being performed on the _thing_ in the context  
**O**rient(ation) - the _perspective_ from which the User or Actor interacting with the system has
during this _operation_ on this _thing_ at this moment

TAOs are formally defined in description and in code using distinct `String`s for each aspect
making up a member of the _Set_.  
An example descriptor would be: `{User, Find, Portal}`  
Translating this to code that executes with tao.js you will see it as either:

* an Object hash: `{ t: 'User', a: 'Find', o: 'Portal' }`  
  OR
* an Array of strict ordering based on the TAO acronym: `['User', 'Find', 'Portal']`

The TAO represents a _possible_ state of the application as a context that can be executed
within the application.

## AppCons are Actual States

tao.js expresses the Actual States of an Application through the use of AppCons, representing
Application Contexts through which an Actor transitions while interacting with the Application.

AppCons differ from the TAO in that they can (not required) include associated data for any or all
of the 3 aspects of the TAO.

This is most often expressed as an individual or list of Objects that represent the Term for
the given Context, but don't limit your thinking to attaching all individual AppCon data to
Terms alone.  Distinct Actions can also be expressed with the Action's data, e.g. `Find` could contain either an individual `id` used to fetch the given Object representing the Term or a set of search criteria to get a list of Objects reprenting the Term.  The same goes for Orient(ation)s
which it's often helpful to attach authorization or session data.

## Example Application

Before moving ahead, it's important to describe the application most often used in examples throughout this book which is that of an individualized
version of Urban Dictionary.  This App has a Domain Model starting with:

* `Space`s that create an individual dictionary of
* `Phrase`s that are the words or groups of words + definitions of them
* `User`s that can be invited to a `Space` and create `Phrase`s in that `Space`
* `Session`s capturing when each `User` is interacting with the App
* and the `App` itself

These Domain Entities translate directly to Terms of the TAO for the App along with the relationships:

* `Space-Phrase` since a `Phrase` can be shared and exist in more than one `Space`
* `Space-User` since `User`s can create or be invited to join more than one `Space`

## Define your AppCons ahead of writing code

From the [Goals of tao.js](../intro/goals.md) we want to use the language of the TAO to describe
our application as a set of code-translatable requirements that can be understood by technical
and non-technical members of the team.

It is best to start from this place by describing your application as a series of TAOs representing
possible states and transitions from one to the next to generate a protocol chain that describes
the interaction an Actor has with your App.

### Example AppCon descriptions

It's much easier to whiteboard this or draw it on a piece of paper, but for documentations sake
(and future [roadmap](../intro/roadmap.md) consideration) we're going to provide an example in
markdown.  A good place to start is the intial Use Case of a User coming to the App to begin a new Session:

|from TAO               |to TAO                 |description|
|-----------------------|-----------------------|-----------|
||`{App,Enter,Portal}`|initial TAO that sets the App in motion (this can be anything you want)|
|`{App,Enter,Portal}`|->`{App,View,Portal}`|after entering, we want to show the App's Portal|
|`{App,View,Portal}`|->`{Space,Find,Portal}`|visitng the App's initial Portal View triggers a fetch for the items that should be visible|
|`{Space,Find,Portal}`|->`{Space,List,Portal}`|with the items, render the list for the User|

Another example is selecting a `Space` from the initial list presented for the User to enter:

|from TAO|to TAO|description|
|--------|------|-------------|
|`<user triggered>`|`{Space, Enter, Portal}`|initial triggering TAO that begins the Use Case|
|`{Space, Enter, Portal}`|->`{Space, View, Portal}`|show the Space View to the User|
|`{Space, Enter, Portal}`|->`{Space-Phrase,Find,Portal}`|entering the Space triggers a fetch for the related items|
|`{Space-Phrase, Find, Portal}`|->`{Space-Phrase, List, Portal}`|list the found items for the User|

## Using AppCons in your Application


