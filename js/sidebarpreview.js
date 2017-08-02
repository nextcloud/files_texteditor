/*
 * Copyright (c) 2016
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

(function () {
	var SidebarPreview = function () {
	};

	SidebarPreview.prototype = {
		attach: function (manager) {
			var mimes = OCA.Files_Texteditor.getSupportedMimetypes();
			var handler = this.handlePreview.bind(this);
			$.each(mimes, function (key, value) {
				manager.addPreviewHandler(value, handler);
			});
		},

		handlePreview: function (model, $thumbnailDiv, $thumbnailContainer, fallback) {
			var previewWidth = $thumbnailContainer.parent().width() + 50;  // 50px for negative margins
			var previewHeight = previewWidth / (16 / 9);

			this.getFileContent(model.getFullPath()).then(function (content) {
				content = content.filecontents;
				$thumbnailDiv.removeClass('icon-loading icon-32');
				$thumbnailContainer.addClass('large');
				$thumbnailContainer.addClass('text');
				var $editorDiv = $("<div id='sidebar_editor'/>");
				$editorDiv.text(content);
				$thumbnailDiv.children('.stretcher').remove();
				$thumbnailDiv.append($editorDiv);
				var editor = ace.edit('sidebar_editor');
				editor.setReadOnly(true);
				var syntaxModePromise;
				if (model.get('mimetype') === 'text/html') {
					syntaxModePromise = OCA.Files_Texteditor.getSyntaxMode('html');
				} else {
					// Set the syntax mode based on the file extension
					syntaxModePromise = OCA.Files_Texteditor.getSyntaxMode(
						model.get('name').split('.')[model.get('name').split('.').length - 1]
					);
				}
				syntaxModePromise.then(function(SyntaxMode) {
					if (SyntaxMode) {
						editor.getSession().setMode(new SyntaxMode());
					}
				});
				// Set the theme
				OC.addScript(
					'files_texteditor',
					'core/vendor/ace-builds/src-noconflict/theme-clouds',
					function () {
						editor.setTheme("ace/theme/clouds");
					}
				);
				$editorDiv.css("height", previewHeight);
				$editorDiv.css("width", previewWidth);
			}, function () {
				fallback();
			});
		},

		getFileContent: function (path) {
			var parts = path.split('/');
			var dir = parts.slice(0, -1).join('');
			var file = parts.slice(-1).join('');

			return $.ajax({
				url: OC.generateUrl('/apps/files_texteditor/ajax/loadfile'),
				data: {
						filename: file,
						dir: dir
				},
				headers: {
					'Range': 'bytes=0-10240'
				}
			});
		}
	};

	OC.Plugins.register('OCA.Files.SidebarPreviewManager', new SidebarPreview());
})();
