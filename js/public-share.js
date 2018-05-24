// FIXME: Hack for single public file view since it is not attached to the fileslist
$(document).ready(function(){
	var isPublic = $('#isPublic').val();
	var mimetype = $('#mimetype').val();
	var filesize = $('#filesize').val();

	if (isPublic &&
		mimetype === 'text/markdown' &&
		filesize < 524288) {

		var sharingToken = $('#sharingToken').val();
		var downloadUrl = OC.generateUrl('/s/{token}/download', {token: sharingToken});
		var previewElement = $('#imgframe');
		var renderer = new marked.Renderer();
		renderer.link = function(href, title, text) {
			try {
				var prot = decodeURIComponent(unescape(href))
					.replace(/[^\w:]/g, '')
					.toLowerCase();
			} catch (e) {
				return '';
			}

			if (prot.indexOf('http:') !== 0 && prot.indexOf('https:') !== 0) {
				return '';
			}

			var out = '<a href="' + href + '" rel="noreferrer noopener"';
			if (title) {
				out += ' title="' + title + '"';
			}
			out += '>' + text + '</a>';
			return out;
		};
		renderer.image = function(href, title, text) {
			if (text) {
				return text;
			}
			return title;
		};
		renderer.blockquote = function(quote) {
			return quote;
		};

		previewElement
			.addClass('icon-loading')
			.children().remove();

		$.get(downloadUrl).success(function(content) {
			previewElement
				.removeClass('icon-loading')
				.addClass('preview formatted-text')
				.html(DOMPurify.sanitize(
					marked(content, {
						renderer: renderer,
						gfm: false,
						breaks: false,
						pedantic: false,
						smartLists: true,
						smartypants: false
					}),
					{
						SAFE_FOR_JQUERY: true
					}
				));
		}).fail(function(result){
			previewElement
				.removeClass('icon-loading');
		});
	} else if (isPublic &&
			   mimetype.substr(0, mimetype.indexOf('/')) === 'text') {
		// Based on default text previews from "files_sharing/js/public.js", but
		// using the public endpoint from files_texteditor for better character
		// encoding support.
		var previewElement = $('#imgframe');
		previewElement
			.addClass('icon-loading')
			.children().remove();

		var bottomMargin = 350;
		var previewHeight = $(window).height() - bottomMargin;
		previewHeight = Math.max(200, previewHeight);

		var sharingToken = $('#sharingToken').val();
		$.ajax({
			url: OC.generateUrl('/apps/files_texteditor/public/{token}', { token: sharingToken }),
			headers: {
				'Range': 'bytes=0-524288'
			}
		}).success(function(content) {
			var textDiv = $('<div/>').addClass('text-preview default-overridden');
			textDiv.text(content);

			previewElement
				.removeClass('icon-loading')
				.addClass('preview')
				.append(textDiv);

			var divHeight = textDiv.height();
			if (content.length > 524289) {
				var ellipsis = $('<div/>').addClass('ellipsis');
				ellipsis.html('(&#133;)');
				ellipsis.appendTo('#imgframe');
			}
			if (divHeight > previewHeight) {
				textDiv.height(previewHeight);
			}
		});
	}
});
