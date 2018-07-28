# Defining Handlers for your App

Now that we know what Application Contexts and AppCons are that set the state of our Application's
State Machine, we use Handlers to let our app react to the transitions from one to the next.

## Example Application

Using our Example Application from [Defining Application Contexts for your App](defining-app-cons.md),
we are going to elicit what should occur when we encounter the AppCons we defined
during that example.

## Define your Handlers ahead of writing code

From the [Goals of tao.js](../intro/goals.md) we want to use the language of the TAO to describe
our application as a set of code-translatable requirements that can be understood by technical
and non-technical members of the team.

Going through this exercise will allow us to:

* be structured in our thinking before we begin coding, allowing for...
* better planning effort on what needs to be written  
  AND
* better visibility into what's missing  
  AND
* ability to add more later and document it

## TAO-Path = Protocol of AppCon Transitions

We can use a TAO-Path to define a Use Case by clearly describing a protocol of transitions
from one AppCon to the next that should take place for the Use Case or User Story to
provide its value.

Within these TAO-Paths we identify and describe specific handlers and expected outcomes,
communicating to the team what we expect the software to accomplish.

## Example Use Cases as TAO-Paths

### Use Case: User Enters the App

From our earlier example, the intial Use Case of a User coming to the App, the AppCons we
defined and the handlers that need to perform:

||Term|Action|Orient|handler spec|
|---|----|------|------|-----------|
|Open App|`App`|`Enter`|`Portal`|trigger initial AC when the App starts executing on a User visit|
|`=>`|`App`|`View`|`Portal`|get the Portal's containing View and render it|
|`=>`|`Space`|`Find`|`Portal`|fetch all of the `Space`s from api|
|`=>`|`Space`|`List`|`Portal`|show the `Space` List View in the Portal|

While heading towards a more detailed spec that a developer can start to code, it's still
readable and understandable to non-technical members of the team, allowing for _**Agreement on
what should take place**_ when a _User Enters the App_.

### Use Case: User Views Space

Another example is a TAO-Path that provides the protocol for when a user views a Space:

||Term|Action|Orient|handler spec|
|---|----|------|------|-----------|
|User selects Space|`Space`|`Enter`|`Portal`|AC signaling actor is entering an individual `Space`|
|`=>`|`Space`|`View`|`Portal`|get the `Space` View and put it in the UI|
|`=>`|`Space-Phrase`|`Find`|`Portal`|fetch all of the `Space-Phrase` relations from the api|
|`=>`|`Space-Phrase`|`List`|`Portal`|show the list of `Phrase`s for a `Space` in the UI|

### Use Case: User Edits Space

A final example is a TAO-Path that represents when a user edits the details of a `Space`:

||Term|Action|Orient|handler spec|
|---|----|------|------|-----------|
|User hits edit|`Space`|`Edit`|`Portal`|get the `Space` Edit form and put it in the UI|
|User hits cancel|`Space`|`Enter`|`Portal`|go back to the [User Views Space](#use-case-user-views-space) TAO-Path|
|User hits save|`Space`|`Update`|`Portal`|get the updated `Space` data and send it to the api|
|`=>`|`Space`|`Store`|`Portal`|store the updated `Space`s data for later retrieval in the `Portal`|
|`=>`|`Space`|`Store`|`Admin`|store the updated `Space`s data for later retrieval in the `Admin`|
|`=>`|`Space`|`Enter`|`Portal`|go back to the [User Views Space](#use-case-user-views-space) TAO-Path|

## TAO-Paths with Advanced Usage

TAO-Paths provide a much more powerful tool when layered in with the [Advanced Topics](../advanced/README.md)
discussed later in the guide.  In that space we will also explore varying the Orient(ation)
aspect of taoples and AppCons to add a depth to our specs that will surface gaps and ensure
we understand a lot more about what software we plan to write without additional effort.
