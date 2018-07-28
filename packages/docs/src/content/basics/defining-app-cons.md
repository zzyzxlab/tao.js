# Defining Application Contexts for your App

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

It is best to start from this place by describing your application as a series of taoples
representing possible states and transitions from one to the next to generate a protocol chain
that describes the interaction an Actor has with your App.

## Example AppCon descriptions

It's much easier to whiteboard this or draw it on a piece of paper, but for documentations sake
(and future [roadmap](../intro/roadmap.md) consideration) we're going to provide an example in
markdown.

### Example Initial AppCons descriptions

A good place to start is the intial Use Case of a User coming to the App and the
AppCons that we expect to encounter:

|Term|Action|Orient|description|
|----|------|------|-----------|
|`App`|`Enter`|`Portal`|initial taople that sets the App in motion (this can be anything you want)|
|`App`|`View`|`Portal`|user views the App's Portal|
|`Space`|`Find`|`Portal`|find all of the `Space`s defined|
|`Space`|`List`|`Portal`|render the list of `Space`s for the User|

### Example Space Details descriptions

Another example is AppCons that represent contexts when a user views a Space:

|Term|Action|Orient|description|
|----|------|------|-----------|
|`Space`|`Enter`|`Portal`|taople signaling actor is entering an individual `Space`|
|`Space`|`View`|`Portal`|`Space` details View in App's Portal|
|`Space-Phrase`|`Find`|`Portal`|find all of the `Space-Phrase` relations defined|
|`Space-Phrase`|`List`|`Portal`|show the list of `Phrase`s for a `Space`|

### Example Space Edit descriptions

|Term|Action|Orient|description|
|----|------|------|-----------|
|`Space`|`Edit`|`Portal`|taople signaling actor wants to edit a `Space`|
|`Space`|`Update`|`Portal`|actor updated the `Space`'s data|
|`Space`|`Store`|`Portal`|store the `Space`s data for later retrieval|
