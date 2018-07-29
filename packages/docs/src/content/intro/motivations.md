# Motivations for tao.js

An App Building story

Apps are easy to build, hard to maintain and even harder to evolve.

We develop various Architectures to make the latter 2 easier, while making the 1st harder

…or we make the first 2 easier and the last one…almost unbearable.

We need a new _Way_ of building Apps that makes them:

1. Easy to build using things we already know
1. Easy to understand and maintain
1. Easy to _Evolve_ over time because we want it to continue to live and operate  
  these are our creations of course
1. Allow us to choose the frameworks we like using

Ok, so let's get started.  How do we describe an App?

…well, that depends on what you mean by _describing_ an App?

How about what is the basis of an App?

Let's see…an App is…

* …a way of manipulating data to automate and derive value of a process
* …a large state machine that moves from one state to the next guided by the influence of
  system actors and business logic constraining those transitions
* …something I hack on until others stop complaining about the bugs and then ask me to develop
  more features for it because it doesn't :v: do what it's supposed to :v:

…mkay…

let's start with the first one…manipulating data

What can we do with _data_ in order to manipulate it?

Well, there's the tried and true CRUD.  That works.  It's always been a thing and it's
the basis for our REST APIs.

Ok, let's step back and look at this CRUD thing, starting with C for Create:

So we want to Create something in our App.  Let's call it, "Thing."
To describe this App's influence on Thing, we can say:
> Create Thing

No, not exactly.

Why not?

Well, to really Create Thing, we need to:

1. Get an interaction from the System Actor (aka User) telling the App the User is ready to Create Thing
1. Show the User a Form allowing to input the _data_ needed for Create Thing
1. Validate the _data_ the User input to Create Thing
1. Send the Thing data to an API so the API can facilitate Create Thing
1. Check the User's Authorization to Create Thing in the API
1. Derive all of the data required to Create Thing for the User in the Permanent Data Store (aka Database)
1. Start a transaction in the Permanent Data Store
1. Save the data to the Permanent Data Store
1. Commit the transaction

So "Create Thing" means all of that?

Pretty much…most of the time…plus some other stuff.

Wait, like what!?

Well, if there's a problem trying to save the data to the Permanent Data Store, then we have
to roll back the transaction.

Seems…

Oh…and if User is an average User of the App, then she's going to Create Thing from her
own perspective of the System.  But if we have Super Users like Admins who have their
own Interface to interact with the App, when an Admin Creates Thing, we need to handle it
differently.

Ok, I get it.  Creating is very complicated.

You said it.

So if Create is complicated, let's try something easier in CRUD, like…R for Retrieve.

Sounds good.

Back to our Thing, we can describe our App by saying:
> Retrieve Thing

Sure, if you want to miss something?

Ok, now what?

To Retrieve Thing, we need to know a little more, like:

* Are you trying to render Thing in a UI?
* For whom is the UI meant? Regular Users? Admins?
* Are you trying to Report on Thing?

Ok, I get it…CRUD isn't exactly a good enough way to describe an App.

Let's try something else.
