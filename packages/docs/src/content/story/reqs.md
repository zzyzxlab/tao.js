# Requirements for the New Build

With our background [problem](problem.md), we have set the stage for the requirements of our new
build.

Our requirements come in 3 different flavors for this new build.  When taking on a new build such
as this, the feature requirements are usually the easiest part to gather, since at a minimum, if
the application is to deliver what customers can receive from the current version, then it must
as a base line deliver the same set of features as the existing version.

What is more important to focus on with a new build is what will be gained with the new build
from scratch of the application or product?

## Feature Requirements

The new build of our Media Management application needs to include the features of the existing
application with a richer set of capabilities and deeper integration into the content creation
tools in order to realize the potential of the Media Management application that it currently is
unable to do in the existing product.

Richer capabilities were sought around the management of:

* Content Creation & Lifecycle
* Content Organization
* User Management and Permissions
* Reports
* Notifications and Alerts

Additionally, deeper integration with the content creation tools allowing:

* Automation of a publishing pipeline
* Control over content creation tools permissions
* Remote control of capturing tools

Finally, better integration with products that are already being integrated with our solutions
through Value Added Resellers (VAR):

* Cisco Routers
* CDNs (like Akamai and AWS Cloudfront)
* Crestron Room Controls
* Blackboard

## Packaging Requirements

The existing Media Management application is a client-server based application that was installed
on a client's own hardware because that was a requirement of the first few iterations of the
product.  Now that we're in a new build scenario, we want to be able to offer it as a self-hosted
install or a SaaS product with multi-tenancy capability.

Beyond the set of [Feature Requirements](#feature-requirements) described above, it would be
advantageous to factor in the different usage scenarios and provide differing solutions to our
growing list of differing customers.

Treating the Media Management application like a Product Line with different solution packages
and modules available to add onto or package together to meet the different needs
will allow our sales team an easier path to convincing the customer to buy with prequalification
towards one of our package offerings.  It would also allow the product and engineering teams the
ability to match solutions to customer demands, divide labor by them and provide an easier path
to upgrade and maintenance scenarios.

Serving the needs of a Fortune 100 enterprise with 200,000 employees spread across the globe for
internal CEO communications and corporate content differ from a University using it for
distribution of course lectures and materials through an integration with Blackboard.

Additionally, a lower end version without all of the bells and whistles of real-time event
tracking and course management would allow the establishment of a beachhead in customers with
smaller budgets or hesitent to commit as well as establish the company as a leader in the space
instead of giving that market to cheaper solutions to use with our content creation tools.

For that reason, you advocated for the building out of different customer-centric versions that
would be packaged by layering sets of features as modules on top of a simplistic base
application, e.g.:

* Base Media Management application - content and organization, basic users and organization
* Education - integration with Blackboard, organization templated around needs of courses
* Enterprise - integration with Cisco Routers and tigher integration with content creation tools, real-time tracking, LDAP-enabled user management

## API Requirements

The existing Media Management application was not built to be API-driven.  Rather it was
originally built as a server-rendered client-server web application.  With the new build we want
to take advantage of all of the advances in building Single-Page Apps (SPAs) and an API-driven
approach.

The majority of our sales are through our Channel partnerships with Value Added Resellers (VARs).
What they were looking for more than anything are products that can meet the needs of their
clients that also provide them with additional space to add value by building integrations for
which they can charge for their services.

To provide this, our new build should have a rich API for extending functionality to
integrations beyond those we can build out of the box.  The needs of having an API as a
requirement weren't part of the existing Media Management application but were long sought for
by our VAR partners, so they must be included in the new build.

## Moving to Solution Designs

As your team asks for help in how to tackle designing the solution, it occurs to you that a
previously unrelated realization, that [Apps are Data](data.md) would help you help them.
