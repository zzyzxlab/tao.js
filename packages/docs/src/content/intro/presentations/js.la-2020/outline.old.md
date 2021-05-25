# Solve Technical Debt by Decoupling Apps from Architecture

## Self Intro

I'm Jeff Hoffer

## Story time - some parts of my history

### Beginner & Student

* I had trouble deciding on software designs I made
* Led me to GoF Design Patterns
* Became an evangelist for Design Patterns when I went back to finish my degree at USC
* Started devouring every DP book I could find

### Countrywide

* Handed software problems to solve - quickly jumped into architecting
* ePace and the Meta Data Model - architecting my own Tech Debt
* DirectLink to BizLink - rearchitecting someone else's Tech Debt

### Accordent

* Commercial Products with horrible Tech Debt & a $70k license fee
* Real-time Tracking & Reporting
* Architecting a Portal - make it extensible

## Dream

* Wouldn't it be great if we could easily store data in multiple databases?
* Wouldn't it be great if we could easily remove code we don't want?
* Wouldn't it be great if we could easily add new code for side effects like tracking?
* Wouldn't it be great if we had an extensible architecture where an App is built using the same extension mechanism so essentially the App is extending from `0`?

## My Work to Solve these Problems

### Solution

* Describe Applications Business/App Events defining a Context - Application Context
* Implement Application Logic by subscribing to & publishing these Events
* Use a Signal Network that spans all stacks as the Medium for Subscribing Handlers and Publishing Signals
* Features of an App are built using these mechanisms, described using these mechanisms, and loaded using these mechanisms

### C# = Nope

Tried to first implement using C# but it was too strict for what I thought I was trying to do

### JS - Just the right fit

Tried it once in nsome spare time

### JS - Plane Flight from Seattle

On my way home from Seattle on a plane flight I decided to just build what I wanted adn make it work

### This became tao.js

#### AppCons Definition

Application Contexts are defined as:

* *T*erm - what thing is part of the context
* *A*ction - what is happening right now
* *O*rient - from what perspective is it happening

Any of them can be a wildcard when subscribing

#### Handlers come in 3 "Sizes"

* Inline - happens in order
* Async - happens out of band (side effect)
* Intercept - determines whether the others will be called or not

#### Signal Network

Signal Network is the Architecture with the simple API

Signal Network implementations can be swapped out without changing the business logic of the apps we build
