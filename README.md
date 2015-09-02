files_texteditor
================

A text editor app for ownCloud

To see which files are editable, see [here](https://github.com/owncloud/files_texteditor/blob/master/js/editor.js)


Preview apps
----

Apps can add side-by-side previews to the app for certain file types by using the preview api

```js

OCA.MYApp.Preview = function(){
    ...
}

OCA.MYApp.Preview.Prototype = {
    /**
     * Give the app the opportunity to load any resources it needs and prepare for rendering a preview
     */
    init: function() {
        ...
    },
    /**
     * @param {string} the text to create the preview for
     * @param {jQuery} the jQuery element to render the preview in
     */
    preview: function(text, previewElement) {
        ...
    }
}

OCA.Files_Texteditor.registerPreviewPlugin('text/markdown', new OCA.MYApp.Preview());

```

For styling of the preview, the preview element will have the id `preview` and the className will be set to the mimetype of the file being eddited with any slash replaced by dashes.

e.g. when editing a markdown file the preview element can be styled using the `#preview.text-markdown` css query.
