import {getSyntaxMode} from './SyntaxMode';
import importAce from './ImportAce';
import escapeHTML from 'escape-html'
import {generateUrl} from '@nextcloud/router';

/** @type array[] supportedMimeTypes */
const supportedMimeTypes = require('./supported_mimetypes.json');

let ace;
export const Texteditor = {

	/**
	 * Holds the editor container
	 */
	$container: null,

	/**
	 * Holds the editor element ID
	 */
	editor: 'filestexteditor',

	/**
	 * Stores info on the file being edited
	 */
	file: {
		edited: false,
		mtime: null,
		dir: null,
		name: null,
		writeable: null,
		mime: null,
		size: null
	},

	/**
	 * Stored the saving state
	 */
	saving: false,

	/**
	 * Current files app context
	 */
	currentContext: null,

	/**
	 * Stores the autosave timer
	 */
	saveTimer: null,

	/**
	 * Stores the old page title
	 */
	oldTitle: null,

	/**
	 * Stores the timeout for the saving message
	 */
	saveMessageTimeout: null,

	/**
	 * preview plugins by mimetype
	 */
	previewPlugins: {},

	registerPreviewPlugin: function (mimeType, plugin) {
		this.previewPlugins[mimeType] = plugin;
	},

	previewPluginsLoaded: {},

	/**
	 * preview element
	 */
	preview: null,

	previewPluginOnChange: null,

	/**
	 * Save handler, triggered by the button, or keyboard
	 */
	_onSaveTrigger: function () {
		// Don't save if not edited
		if (!Texteditor.file.edited) {
			return;
		}
		// Don't try to save twice
		if (Texteditor.saving) {
			return;
		} else {
			Texteditor.saving = true;
			Texteditor.file.edited = false;
		}

		// Can any fade outs on the saving message
		clearTimeout(Texteditor.saveMessageTimeout);

		// Set the saving status
		var $message = $('#editor_controls').find('small.saving-message');
		$message.text(t('files_texteditor', 'Saving …'))
			.show();
		// Send to server
		Texteditor.saveFile(
			window.aceEditor.getSession().getValue(),
			Texteditor.file,
			function (data) {
				// Yay
				if (Texteditor.file.edited == false) {
					document.title = Texteditor.file.name + ' - ' + Texteditor.oldTitle;
					$('small.unsaved-star').css('display', 'none');
				}
				Texteditor.file.mtime = data.mtime;
				Texteditor.file.size = data.size;

				$message.text(t('files_texteditor', 'Saved!'));
				Texteditor.saveMessageTimeout = setTimeout(function () {
					$('small.saving-message').fadeOut(200);
				}, 2000);
			},
			function (message) {
				// Boo
				if (typeof message == 'undefined') {
					$('small.saving-message').text(t('files_texteditor', 'Failed!'));
				} else {
					$('small.saving-message').text(message);
				}
				Texteditor.saveMessageTimeout = setTimeout(function () {
					$('small.saving-message').fadeOut(200);
				}, 5000);
				Texteditor.file.edited = true;
			}
		);
		Texteditor.saving = false;
		window.aceEditor.focus();
	},

	/**
	 * Handles on close button click
	 */
	_onCloseTrigger: function () {
		// Hide or close?
		if (!Texteditor.file.edited) {
			Texteditor.closeEditor();
		} else {
			// Trick the autosave attempt into thinking we have no changes
			Texteditor.file.edited = false;
			// Hide the editor
			Texteditor.hideEditor();
			// Try to save
			Texteditor.saveFile(
				window.aceEditor.getSession().getValue(),
				Texteditor.file,
				function () {
					OC.Notification.showTemporary(t(
						'files_texteditor',
						'Saved'
						)
					);
					// Remove the editor
					Texteditor.closeEditor();
				},
				function () {
					OC.Notification.showTemporary(t(
						'files_texteditor',
						'There was a problem saving your changes. Click to resume editing.'
					));
					$('#notification').data('reopeneditor', true).on(
						'click',
						Texteditor._onReOpenTrigger
					);
					Texteditor.file.edited = true;
				}
			);
		}
	},

	/**
	 * Handles the trigger or re open editor
	 */
	_onReOpenTrigger: function () {
		if ($('#notification').data('reopeneditor') == true) {
			document.title = Texteditor.file.name + ' - ' + Texteditor.oldTitle;
			Texteditor.$container.show();
		}
	},

	/**
	 * Handles the FileAction click event
	 */
	_onEditorTrigger: function (filename, context) {
		this.currentContext = context;
		this.file.name = filename;
		this.file.dir = context.dir;
		this.fileList = context.fileList;
		importAce().then((_ace) => {
			require('brace/ext/searchbox');
			ace = _ace;
			this.loadEditor(
				Texteditor.$container,
				Texteditor.file
			);
			history.pushState({
				file: filename,
				dir: context.dir
			}, 'Editor', '#filestexteditor');
		});
	},

	/**
	 * Handler for edits detected
	 */
	_onEdit: function () {
		if (!Texteditor.file.edited) {
			Texteditor.file.edited = true;
			if (!Texteditor.saving) {
				Texteditor._onUnsaved();
			}
		}
		if (this.previewPluginOnChange) {
			var text = window.aceEditor.getSession().getValue();
			this.previewPluginOnChange(text, this.preview);
		}
	},

	/**
	 * Handler when unsaved work is detected
	 */
	_onUnsaved: function () {
		document.title = '* ' + Texteditor.file.name + ' - ' + Texteditor.oldTitle;
		$('small.unsaved-star').css('display', 'inline-block');
	},

	/**
	 * Setup on page load
	 */
	initialize: function (container) {
		// Don't load if not in the files app TODO: Fix for sharing
		if (!$('#content.app-files').length) {
			return;
		}
		this.$container = container;
		this.registerFileActions();
		this.oldTitle = document.title;
	},

	/**
	 * Registers the file actions
	 */
	registerFileActions: function () {
		supportedMimeTypes.forEach((mime) => {
			OCA.Files.fileActions.registerAction({
				name: 'edit_texteditor',
				displayName: t('files_texteditor', 'Edit in plain text editor'),
				mime: mime,
				actionHandler: this._onEditorTrigger.bind(this),
				permissions: OC.PERMISSION_READ,
				iconClass: 'icon-edit'
			});
			OCA.Files.fileActions.setDefault(mime, 'edit_texteditor');
		});
	},

	/**
	 * Actually fire up the editor in a container
	 */
	loadEditor: function (container, file) {
		var _self = this;
		// Insert the editor into the container
		container.html(
			'<div id="editor_overlay"></div>'
			+ '<div id="editor_container" class="icon-loading">'
			+ '<div id="editor_wrap"><div id="filestexteditor"></div>'
			+ '<div id="preview_wrap"><div id="preview"></div></div></div></div>');
		$('#content').append(container);

		// Get the file data
		this.loadFile(
			file.dir,
			file.name,
			function (file, data) {
				// Success!
				// Sort the title
				document.title = file.name + ' - ' + Texteditor.oldTitle;
				// Load ace
				$('#' + _self.editor).text(data);
				// Remove loading
				$('#editor_container').removeClass('icon-loading');
				// Configure ace
				_self.configureACE(file);
				// Show the controls
				_self.loadControlBar(file);
				window.aceEditor.getSession().on('change', _self.setupAutosave);
				_self.bindVisibleActions();
				window.aceEditor.focus();

				if (_self.previewPlugins[file.mime]) {
					_self.preview = container.find('#preview');
					_self.preview.addClass(file.mime.replace('/', '-'));
					if (window.aceEditor.getReadOnly()){
						container.find('#editor_container').addClass('onlyPreview');
					}
					container.find('#editor_container').addClass('hasPreview');
					_self.previewPluginOnChange = _.debounce(function (text, element) {
						_self.loadPreviewPlugin(file.mime).then(function () {
							_self.previewPlugins[file.mime].preview(text, element);
						});
					}, 200);
					var text = window.aceEditor.getSession().getValue();
					_self.previewPluginOnChange(text, _self.preview);
					setTimeout(function () {
						window.aceEditor.resize();
					}, 500);
					_self.loadPreviewControlBar();
				} else {
					_self.previewPluginOnChange = null;
				}
			},
			function (message) {
				// Oh dear
				OC.dialogs.alert(message, t('files_texteditor', 'An error occurred!'));
				_self.closeEditor();
			});
	},

	loadPreviewPlugin: function (mime) {
		if (this.previewPluginsLoaded[mime]) {
			return $.Deferred().resolve().promise();
		}
		this.previewPluginsLoaded[mime] = true;
		var plugin = this.previewPlugins[mime];
		return $.when(plugin.init());
	},

	/**
	 * Load the editor control bar
	 */
	loadControlBar: function (file) {
		var html =
			'<small class="filename">' + escapeHTML(file.name) + '</small>'
			+ '<small class="unsaved-star" style="display: none">*</small>'
			+ '<small class="saving-message">'
			+ '</small>'
			+ '<button id="editor_close" class="icon-close svg"></button>';
		var controlBar = $('<div id="editor_controls"></div>').html(html);
		$('#editor_wrap').before(controlBar);
		this.setFilenameMaxLength();
		this.bindControlBar();

	},

	setPreviewMode: function (mode) {
		var container = $('#app-content-texteditor');
		var controlBar = $('#preview_editor_controls');
		controlBar.find('button').removeClass('active');
		controlBar.find('button[data-type="' + mode + '"]').addClass('active');
		switch (mode) {
			case 'mixed':
				container.find('#editor_container').addClass('hasPreview');
				container.find('#editor_container').removeClass('onlyPreview');
				break;
			case 'text':
				container.find('#editor_container').removeClass('hasPreview');
				container.find('#editor_container').removeClass('onlyPreview');
				break;
			case 'image':
				container.find('#editor_container').addClass('hasPreview');
				container.find('#editor_container').addClass('onlyPreview');
				break;
		}
		setTimeout(function () {
			window.aceEditor.resize();
		}, 500);
	},

	loadPreviewControlBar: function () {
		var makeButton = function (type, tooltip, active) {
			var button = $('<button/>');
			button.tooltip({
				title: tooltip,
				container: 'body',
				placement: 'bottom',
				delay: {show: 500, hide: 0}
			});
			if (active) {
				button.addClass('active');
			}
			button.click(this.setPreviewMode.bind(this, type));
			button.attr('data-type', type);
			return button.css('background-image', 'url("' + OC.imagePath('files_texteditor', type) + '")');
		}.bind(this);

		var readonly = window.aceEditor.getReadOnly();
		var controls = $('<span/>').attr('id', 'preview_editor_controls');
		controls.append(makeButton('text', t('files_texteditor', 'Edit')));
		controls.append(makeButton('mixed', t('files_texteditor', 'Mixed'), !readonly));
		controls.append(makeButton('image', t('files_texteditor', 'Preview'), readonly));
		$('#editor_close').after(controls);
	},

	/**
	 * Removes the control bar
	 */
	unloadControlBar: function () {
		$('#editor_controls').remove();
	},

	/**
	 * Set the max width of the filename to prevent wrapping
	 */
	setFilenameMaxLength: function () {
		// Get the width of the control bar
		var controlBar = $('#editor_controls').width();
		// Get the width of all of the other controls
		var controls = $('small.saving-message').outerWidth(true);
		controls += $('small.unsaved-star').outerWidth(true);
		controls += $('#editor_close').outerWidth(true);
		// Set the max width
		$('small.filename').css('max-width', controlBar - controls - 28);
	},

	/**
	 * Binds the control events on the control bar
	 */
	bindControlBar: function () {
		$('#editor_close').on('click', _.bind(this._onCloseTrigger, this));
		$(window).resize(Texteditor.setFilenameMaxLength);
		window.onpopstate = function () {
			var hash = location.hash.slice(1);
			if (hash.slice(0, 6) !== 'editor') {
				this._onCloseTrigger();
			}
		}.bind(this);
	},

	/**
	 * Configure the ACE editor
	 */
	configureACE: function (file) {
		window.aceEditor = ace.edit(this.editor);
		aceEditor.getSession().setNewLineMode("auto");
		aceEditor.setShowPrintMargin(false);
		aceEditor.getSession().setUseWrapMode(true);
		if (!file.writeable) {
			aceEditor.setReadOnly(true);
		}
		if (file.mime && file.mime === 'text/html') {
			this.setEditorSyntaxMode('html');
		} else {
			// Set the syntax mode based on the file extension
			this.setEditorSyntaxMode(
				file.name.split('.')[file.name.split('.').length - 1]
			);
		}
		// Set the theme
		import('brace/theme/clouds').then(() => {
			window.aceEditor.setTheme("ace/theme/clouds");
		});
		// Bind the edit event
		window.aceEditor.getSession().on('change', this._onEdit.bind(this));
		// Bind save trigger
		window.aceEditor.commands.addCommand({
			name: "save",
			bindKey: {
				win: "Ctrl-S",
				mac: "Command-S",
				sender: "editor"
			},
			exec: Texteditor._onSaveTrigger
		});

		// disable Ctrl-T shortcut in ace to allow new tab feature in browser
		window.aceEditor.commands.removeCommand(window.aceEditor.commands.byName.transposeletters);
	},

	/**
	 * Sets the syntax highlighting for the editor based on the file extension
	 */
	setEditorSyntaxMode: function (extension) {
		getSyntaxMode(extension).then(function (mode) {
			if (mode) {
				window.aceEditor.getSession().setMode(`ace/mode/${mode}`);
			}
		});
	},

	/**
	 * Loads the data through AJAX
	 */
	loadFile: function (dir, filename, success, failure) {
		fetch(generateUrl('/apps/files_texteditor/ajax/loadfile?' + new URLSearchParams({
			filename: filename,
			dir: dir
		})), {
			'headers': {
				requesttoken: OC.requestToken
			}
		})
			.then(response => response.json())
			.then(data => {
				if (data.message) {
					failure(data.message);
					return;
				}
				// Call success callback
				Texteditor.file.writeable = data.writeable;
				Texteditor.file.mime = data.mime;
				Texteditor.file.mtime = data.mtime;
				success(Texteditor.file, data.filecontents);
			});
	},

	/**
	 * Send the new file data back to the server
	 */
	saveFile: function (data, file, success, failure) {
		// Send the post request
		var path = file.dir + file.name;
		if (file.dir !== '/') {
			path = file.dir + '/' + file.name;
		}
		fetch(generateUrl('/apps/files_texteditor/ajax/savefile'), {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				requesttoken: OC.requestToken
			},
			body: JSON.stringify({
				filecontents: data,
				path: path,
				mtime: file.mtime
			})
		})
			.then(response => response.json())
			.then(data => {
				if (data.message) {
					failure(data.message);
				} else {
					success(data);
				}
			});
	},

	/**
	 * Close the editor for good
	 */
	closeEditor: function () {
		this.$container.html('').show();
		this.unloadControlBar();
		this.unBindVisibleActions();
		var fileInfoModel = this.fileList.getModelForFile(this.file.name);
		if (fileInfoModel) {
			fileInfoModel.set({
				// temp dummy, until we can do a PROPFIND
				etag: fileInfoModel.get('id') + this.file.mtime,
				mtime: this.file.mtime * 1000,
				size: this.file.size
			});
		}
		document.title = this.oldTitle;
	},

	/**
	 * Hide the editor (unsaved changes)
	 */
	hideEditor: function () {
		this.$container.hide();
		document.title = this.oldTitle;
		this.unBindVisibleActions();
	},

	/**
	 * Configure the autosave timer
	 */
	setupAutosave: function () {
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(Texteditor._onSaveTrigger, 3000);
	},

	/**
	 * Handles event when clicking outside editor
	 */
	_onClickDocument: function (event) {
		// Check if click was inside the editor or not.
		if (!$(event.target).closest('#editor_container').length && !$(event.target).closest('.oc-dialog').length) {
			// Edit the editor
			Texteditor._onCloseTrigger();
		}
	},

	/*
	 * Binds actions that need to happen whilst the editor is visible
	 */
	bindVisibleActions: function () {
		$(document).bind('click', this._onClickDocument);
	},

	/**
	 * Unbinds actions that happen whilst the editor is visible
	 */
	unBindVisibleActions: function () {
		$(document).unbind('click', this._onClickDocument);
	}

};
