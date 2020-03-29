# Requirements for the New Build

With our background [problem](problem.md), we have set the stage for the requirements of our new
build.

For the sake of transparency, the results of this story differ from…

What results here is a set of requirements which **should** have been provided but weren't.  There
was disagreement on what the result of a new build should have been.  While the business chose to
focus at a purely feature-oriented level, I found myself wondering about a deeper level of
requirements.

## Feature Requirements

The new build of our Media Management application needed to include the features of the existing application with a
richer set of capabilities and deeper integration into the content creation tools.

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
through Value Added Resellers (VARs):

* Cisco Routers
* CDNs (like Akamai)
* Crestron Room Controls
* Blackboard

## Packaging Requirements

The Media Management application was a client-server based application that was installed on a
client's own hardware.  This was a time when AWS was in its infancy and most enterprises didn't
trust it.

Beyond the set of [Feature Requirements](#feature-requirements) described above, it would be
advantageous to factor in the different usage scenarios and provide differing solutions to our
growing list of differing customers.

Treating the Media Management application like a Product Line with different solution packages
and modules available to add onto or package together to meet the different needs
would allow direct sales an easier path to convincing the customer to buy with prequalification
towards one of our package offerings.  It would also
allow the product and engineering teams the ability to match solutions to customer demands,
divide labor by them and provide an easier path to upgrade and maintenance scenarios.

Serving the needs of a Fortune 100 enterprise with 200,000 employees spread across the globe for
internal CEO communications and corporate content differ from a University using it for
distribution of course lectures and materials through an integration with Blackboard.

Additionally, a lower end version without all of the bells and whistles of real-time event
tracking and course management would allow the establishment of a beachhead in customers with
smaller budgets or hesitent to commit as well as establish the company as a leader in the space
instead of giving that market to cheaper solutions to use with our content creation tools.

For that reason, I advocated for the building out of different customer-centric versions that
would be packaged by layering sets of features as modules on top of a simplistic base
application, e.g.:

* Base Media Management application - content and organization, basic users and organization
* Education - integration with Blackboard, organization templated around needs of courses
* Enterprise - integration with Cisco Routers and tigher integration with content creation tools, real-time tracking, LDAP-enabled user management

## API Requirements

At the start of this project, we were in the middle of the shift to Web 2.0 and the new paradigm
for building web applications.

The majority of our sales were through our Channel partnerships with Value Added Resellers (VARs).
After leading the implementation of our first Reseller Training, I got a chance to meet and get
feedback on their needs.  What they were looking for more than anything are products that can
meet the needs of their clients that also provide them with additional space to add value by
building integrations for which they can charge.

To provide this, our new build should have a rich API for extending its functionality to
integrations beyond those we can build out of the box.  The needs of having an API as a
requirement weren't part of the existing Media Management application but were long sought for
by our VAR partners, so they must be included in the new build.

## Moving to Solution Designs

As my team asked for help in how to tackle designing the solution, it occurred to me that a
previously unrelated realization, that [Apps are Data](data.md) would help me help them.
