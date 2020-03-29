# CFP for CityJS

## Submit to

https://docs.google.com/forms/d/e/1FAIpQLSc_fUyQBfJSjaqLTirzJW-7jLw_IFXa0RIAcJlxA6BzC_x7KQ/viewform

## Full Name

Jeff Hoffer

## Location

Los Angeles, CA, USA

## Bio

With over 20 years of experience developing software for startups and enterprises, scaling to Internet traffic, building and maintaining commercially licensed products, and developing internal enterprise tools, Jeff Hoffer has worked as a Software Engineer, Software Architect and in Director and VP roles leading technology organizations at Intuit, The Bouqs Company, Lunchbox (acquired), Accordent (acquired by Polycom) and Countrywide among consulting work at many other prominent firms.
Jeff is currently a Software Architect at Bluebeam, Inc. a technology company with over 160 million users deliver software solutions to the Construction (AEC) Industry.

## Title

Decoupling Applications from Architectures

## Abstract

Building software applications requires making choices and tradeoffs, many of which are difficult to know early on whether they will fit or not.  Over more than a decade I've developed a way to build software applications decoupling the business application logic from the underlying technical architecture used to deliver the software to users.

I will describe and show this technique to attendees of the talk in a way that allows them to understand the underlying principals for why it works as well as arm them with the ability to do it themselves on their current projects through refactoring or next projects they start from scratch.

## Description

Software is the most malleable building material we've ever created, and yet Technical Debt continues to plague the choices we make when building applications.

When we talk about starting new projects, there's always a debate over getting something out the door knowing we're taking on Technical Debt in order to "move faster" versus taking our time to build it properly and risk overengineering and possibly overfitting our application to an unknown problem.  Can we avoid this Kobayashi Maru?

Like what Docker & Containers did to decouple the Infrastructure Layer from the Application Layer, we can decouple the Business Application from its Technical Architecture.

From 20 years of experience building software applications for different domains, I'll use code samples and example applications to show how we can change the technical architectural choices of our application without affecting the business logic, and prove it's possible to decouple the application from the architecture so we can be fast and build it right.

## Short Description

Showing the way to build software that allows technical architectural decisions to be as malleable and changeable as application business logic, and to ensure business logic doesn't encroach on architecture and vice versa.

## Notes

I have a full fledged example application that was refactored to use the tao.js library allowing the decoupling of the Application Logic from the Technical Architecture and the application also has refactoring of the Architectural pieces to add caching and swap out the data store from a document database to a relational database as well as push-based messaging.
These will be shared during the talk as well as part of a series of blog posts explaining the whole process, principals and library.
Please let me know if you'd like to see some of this work.

# A bit about you

I have been working on this solution for a decade while I've built high scale Internet applications as well as commercial enterprise products that must also scale.  I am now embarking on sharing this with the engineering community abroad starting with the JavaScript community for which I've built the first implementation.

## Extras

Image: ![Avatar](https://en.gravatar.com/userimage/12727498/76ea2d8177e4f21d4dc5437a0b7478e5.jpg?size=300)

I agree to release any and all audio and video recording and broadcast rights to JSConf for publication
