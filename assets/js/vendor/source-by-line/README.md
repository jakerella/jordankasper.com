Source-By-Line
----

This is a small tool for inserting code samples into a page from external sources. 
It's original purpose was for use with the [Reveal.js](https://github.com/hakimel/reveal.js/) 
presentation tool, although it could be used anywhere really. Simply include the 
file in a web page with the proper data attributes. It will grab external resources, 
select specific lines, then dump them back into that HTML node, with highlighting 
if you have the [highlight.js](http://highlightjs.org/) library available.


## Basic Usage

```html
<code data-srcbyline='path/to/beer.js?1-4;10;19-20;31-33'></code>

<script src='path/to/srcByLine.js'></script>
<script>
window.srcbyline.init();
</script>
```

That's it... the specific lines in the data attribute will be displayed on the page, 
but no other lines in that file. You can use single line numbers or a range using 
a hyphen. If you specify a line number past the end of the file it will just print 
a blank line. And if you have the highlight.js library installed the highlighted HTML 
will be inserted instead.

## Integration with Reveal.js

So you want to use this on your Reveal.js slides? So did I! That's why I wrote it.

In your `package.json` file:

```json
"dependencies": {
  "reveal.js": "^2.6.2",
  "src-by-line": "git://github.com/jakerella/source-by-line.git"
}
```
And don't forget to run `npm install` again!

In your Reveal options (typically at the bottom of the main HTML file):

```js
Reveal.initialize({
  // options...

  dependencies: [
    // { other dependencies },
    { src: 'node_modules/reveal.js/plugin/highlight/highlight.js', async: true, callback: function() { hljs.initHighlightingOnLoad(); } },
    // NOTE: highlight.js above is OPTIONAL, but we'll use it if it's there
    { src: 'node_modules/source-by-line/srcByLine.js', async: true, callback: function() { window.srcbyline.init(); } }
  ]
});
```

In your slide content:

```html
<div class='reveal'>
  <div class='slides'>
    <!-- ... other slides ... -->
    <section>
      <pre><code data-trim data-srcbyline='/path/to/beer.js?1-4;10;19-20;31-33'></code></pre>
    </section>
  </div>
</div>
```
