---
title: Next Stage for Mockjax
collection: posts
date: 2014-10-24
tags: development, jquery, mockjax, open source, javascript, testing
---

In 2010, while working for our mutual former employer, [Jonathan Sharp](https://github.com/jdsharp "Jonathan Sharop on Github") started working on a small library to mock Ajax calls made through jQuery in order to better test front end JavaScript code. Since then, fifty different people have contributed to [jQuery Mockjax](https://github.com/jakerella/jquery-mockjax "jQuery Mockjax plugin") to make it one of the simplest tools for mocking out HTTP calls from JavaScript. I took over primary maintenance of the library earlier this year while working at appendTo; however, as of last Friday, October 17, 2014, ownership of the library was transferred to me when appendTo ceased operations.

I wanted to take this opportunity to thank Jonathan and the many other contributors for committing their time and energy into the project and confirm that I do plan to keep working on the project, hopefully along with a couple of my co-conspirators from appendTo: [Doug Neiner](https://github.com/dcneiner "Doug Neiner on Github") and [Jonathan Creamer](https://github.com/jcreamer898 "Jonathan Creamer on Github") (if they'll agree, that is). We recently released [version 1.6.0](https://github.com/jakerella/jquery-mockjax/releases/tag/v1.6.0 "Mockjax v1.6.0") of the library and we are already planning for [version 2.0](https://github.com/jakerella/jquery-mockjax/issues?q=is%3Aopen+is%3Aissue+milestone%3A%22Mockjax+2.0%22 "Mockjax v2.0.0 Milestone")!

### Some Thoughts on OSS

My thoughts on open source software are highly informed by my own experiences (naturally) which are generally quite good. I know that some larger projects have had problems with [schisms in the community](http://dtrejo.com/why-is-node-being-forked.html "Why is Node being forked"), but I have been fortunate to not have to deal with them thus far. My goals with Mockjax are quite simply to keep it simple. This is not a full dependency injection tool for JavaScript testing, there are [other](http://sinonjs.org/ "Sinon") [tools](https://docs.angularjs.org/guide/di "Dependency Injection in Angular") for that. While I am happy to entertain any pull requests, there may be times where the community decides that isn't the direction to go... So who is that community? It's anyone that wants to participate.

For now that community is myself and the other core, regular [contributors](https://github.com/jakerella/jquery-mockjax/graphs/contributors "Mockjax contributors") to Mockjax. But anyone who wants to voice their opinion is welcome to do so. New feature pull requests will remain open for a while to allow for comment, and ultimately someone will have to make the decision whether to merge or not. And again, for now that is myself, Doug Neiner, or Jonathan Creamer. If you would like to discuss a new feature you have an idea for, please feel free to open an [issue on Github](https://github.com/jakerella/jquery-mockjax/issues "Github issues for Mockjax") and we can chat about it there.

### What About Version 2.0?

We're going to be completely reorganizing the codebase (such as it is) for version 2.0, including adding some better testing tools for our own code, and some better organization for the various files. Additionally, we'll be trying to "clean up" the library with better modularization and adherence to coding standards. But of course, what you're really interested in is features, right? Well, we have a couple things planned, but really the library won't be implementing anything terribly crazy.

There are some nasty bugs we want to fix, but those may require some more significant changes than we were hoping for in version 1.6.0. Additionally, we'd like to rework the access to internal data by the calling code, which means changing how things are stored internally. The basic idea is to make your front end testing as easy as possible without the need for external services. We're happy to entertain any other feature ideas, just add your suggestion to the Github issues list! And as for when 2.0 might be released? We'll see... right now the entire set of core contributors are figuring out what's next for themselves!
