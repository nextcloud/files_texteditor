// FIXME: Hack for single public file view since it is not attached to the fileslist
$(document).ready(function(){
	if ($('#isPublic').val() &&
		$('#mimetype').val() === 'text/markdown' &&
		$('#filesize').val() < 524288) {

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
			.children().detach();

		$.get(downloadUrl).success(function(content) {
			previewElement
				.removeClass('icon-loading')
				.addClass('preview')
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
	}
});
