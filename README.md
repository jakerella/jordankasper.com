# So long and thanks for all the fish

This is my homepage. Feel free to poke around, the site is built with [Metalsmith](https://metalsmith.io), a static site generator built in Node.js. I've used a number of plugins from a number of very nice people (you can see the plugins in my package.json file).

If you have any suggestions (content, bug fixes, etc) feel free to make a GitHub issue for them, or submit a PR!

## Structure of Content

The pages of the site are organized under the `/content` directory as `*.html` pages. Each of these points to a layout template in the `/layouts` directory. The layouts are written in handlebars (`*.hbs`). There are some partial, reused layout files in the `/layouts/partials` directory for things like the header, footer, and navigation.

The "profile" and "games" pages also have their content in those `*.html` pages in `/content`, but the home page (`index.html`) and the "events" page (`events.html`) are just containers for the blog and speaking event data respectively.

### Blog Posts

The metalsmith config (in `metalsmith.json`) specifies how the blog posts are pulled in. They're all located in the `/content/posts` directory. Although that directory is sorted alphabetically according to whatever your operating system likes to do, the posts are ordered on the site (and paginated) by metalsmith using the "date" field. Each post is a markdown file, and they each have metadata at the top.

For example, the "My First Cohort" post has this metadata:

```
---
title: My First Cohort
collection: posts
date: 2016-05-14
tags: learning, mentorship, jobs, community
---
```

The `date` field above is used to properly order this post among the others. The `tags` are used for the word cloud, and the `collection` allows metalsmith to distinguish this content from static pages. The `title` should be obvious! Of course, the markdown content is converted to HTML during the build process.

To add a new blog post, we simply need to create the markdown file - with the proper metadata at the top - and rebuild the site. Then we publish it using Netlify (see details further down).

### Presentations

I have [spoken at many events](https://jordankasper.com/events) over the years. I generally host any presentation materials on my website. Those are all located in the `/content/presos` directory. Under that directory, each presentation is its own self-contained mini-site. They use a special presentation layout to centralize the common stuff like my reveal.js plugins and such, but otherwise everything is in there: all of the slides, images, etc.

Each presentation directory is also the path used to access it on my website. In other words, the `/content/presos/civictech` directory will be exposed as `https://jordankasper.com/civictech`

### Event Data

The last piece of content is the list of events available on https://jordankasper.com/events, which is all stored as a large JSON file in the `/plugins` directory. Each entry in this file will display as a single event on the site. The metadata here - like that of the blog posts - will be used for ordering and display.

For example, this is the entry for my talk on Open Source at the Frontrunners conference in 2023:

```
{
    "name": "Frontrunners",
    "url": "https://frontrunners.tech/",
    "location": "Arlington, VA",
    "date": "Mar 10 2023",
    "topics": [
        "Open Source in Civic Tech"
    ]
}
```

### Static Pages and Assets

There are some other assets (the site's JavaScript, CSS, etc) which is all located in the `/assets` directory.

There are also a few non-dynamic static pages in there under `/assets/static`. These are not dynamically built with metalsmith. Instead, this content is served up as is with no injection. This is accomplished using a `copy` task during the metalsmith build. Check out the `/plugins/copy.js` file to see how that's done.


## Building the Site

Building the site is pretty simple, make sure you have all of the dependencies, run the `clean` command, then the `build` command:

1. `npm install`
2. `npm run clean`
3. `npm run build`

How is this all done? Well, the site is built using metalsmith, which itself is highly customizable (one reason I like it). In fact, all of the `*.js` files in the `/plugins` directory are tiny metalsmith plugins. You can see how they are then used in the `metalsmith.json` configuration file.

> If things aren't going well, you should look at the full debug output using: `npm run debug`

The final, static site will be in the `/build` directory and you can **run the site** using your favorite HTTP server tool, serving content from that directory. For example, in Node you could use: `http-server ./build` (presuming you had installed the http-server Node module globally).

### Publishing the Site

This site is deployed to Netlify. To do this, you will need to install the Netlify CLI tool:

`npm i -g netlify-cli`

> Note that currently automated deployments are not enabled.

You will need to login using the Netlify CLI (using `netlify login`) and then publish the site:

`netlify deploy`

This command will generate a preview site that you can check out. Of course, **you should have already tested the site thoroughly locally first**. Once you're ready to deploy the production site, run:

`netlify deploy --prod`

## Copyright

This site is copyright Jordan Kasper, 2018-2024, all rights reserved.

You are welcome to reuse the **code** in the `/plugins` directory as you wish, under an [MIT license](https://github.com/jakerella/jordankasper.com/blob/master/plugins/LICENSE). However, all other content, especially the written content in the `/content` and `/assets/static` directories, is reserved with no permissions.
