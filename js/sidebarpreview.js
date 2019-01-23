/*
 * Copyright (c) 2016
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

import {getSyntaxMode} from "./SyntaxMode";
import importAce from './ImportAce';

/** @type array[] supportedMimeTypes */
const supportedMimeTypes = require('./supported_mimetypes.json');

export class SidebarPreview {
	attach (manager) {
		const handler = this.handlePreview.bind(this);
		supportedMimeTypes.forEach(value => manager.addPreviewHandler(value, handler));
	}

	handlePreview (model, $thumbnailDiv, $thumbnailContainer, fallback) {
		const previewWidth = $thumbnailContainer.parent().width() + 50;  // 50px for negative margins
		const previewHeight = previewWidth / (16 / 9);

		this.getFileContent(model.getFullPath()).then(function (content) {
			content = content.filecontents;
			$thumbnailDiv.removeClass('icon-loading icon-32');
			$thumbnailContainer.addClass('large');
			$thumbnailContainer.addClass('text');
			const $editorDiv = $("<div id='sidebar_editor'/>");
			$editorDiv.text(content);
			$thumbnailDiv.children('.stretcher').remove();
			$thumbnailDiv.append($editorDiv);
			importAce().then((imports) => {
				const editor = imports.edit('sidebar_editor');
				editor.setReadOnly(true);
				let syntaxModePromise;
				if (model.get('mimetype') === 'text/html') {
					syntaxModePromise = getSyntaxMode('html');
				} else {
					// Set the syntax mode based on the file extension
					syntaxModePromise = getSyntaxMode(
						model.get('name').split('.')[model.get('name').split('.').length - 1]
					);
				}
				syntaxModePromise.then(function (mode) {
					if (mode) {
						editor.getSession().setMode(`ace/mode/${mode}`);
					}
				});
				// Set the theme
				import('brace/theme/clouds').then(() => {
					editor.setTheme("ace/theme/clouds");
				});
				$editorDiv.css("height", previewHeight);
				$editorDiv.css("width", previewWidth);
			});
		}, function () {
			fallback();
		});
	}

	getFileContent (path) {
		const parts = path.split('/');
		const dir = parts.slice(0, -1).join('');
		const file = parts.slice(-1).join('');

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
}
