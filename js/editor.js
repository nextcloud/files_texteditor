/**
 * ownCloud - Files_Texteditor
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Tom Needham <tom@owncloud.com>
 * @copyright Tom Needham 2015
 */

var Files_Texteditor = {

	/**
	 * Holds the editor container
	 */
	$container: null,

	/**
	 * Holds the editor element ID
	 */
	editor: 'editor',

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

	registerPreviewPlugin: function(mimeType, plugin) {
		this.previewPlugins[mimeType] = plugin;
	},

	/**
	 * preview element
	 */
	preview: null,

	previewPluginOnChange: null,

	/**
	 * Save handler, triggered by the button, or keyboard
	 */
	_onSaveTrigger: function() {
		// Don't save if not edited
		if(!OCA.Files_Texteditor.file.edited) {
			return;
		}
		// Don't try to save twice
		if(OCA.Files_Texteditor.saving) {
			return;
		} else {
			OCA.Files_Texteditor.saving = true;
			OCA.Files_Texteditor.file.edited = false;
		}

		// Can any fade outs on the saving message
		clearTimeout(OCA.Files_Texteditor.saveMessageTimeout);

		// Set the saving status
		$('#editor_controls small.saving-message')
			.text(t('files_texteditor', 'saving...'))
			.show();
		// Send to server
		OCA.Files_Texteditor.saveFile(
			window.aceEditor.getSession().getValue(),
			OCA.Files_Texteditor.file,
			function(data){
				// Yay
				if(OCA.Files_Texteditor.file.edited == false) {
					document.title = OCA.Files_Texteditor.file.name + ' - ' + OCA.Files_Texteditor.oldTitle;
					$('small.unsaved-star').css('display', 'none');
				}
				OCA.Files_Texteditor.file.mtime = data.mtime;
				OCA.Files_Texteditor.file.size = data.size;

				$('#editor_controls small.saving-message')
					.text(t('files_texteditor', 'saved!'));
				OCA.Files_Texteditor.saveMessageTimeout = setTimeout(function() {
					$('small.saving-message').fadeOut(200);
				}, 2000);
			},
			function(message){
				// Boo
				if (typeof message == 'undefined') {
					$('small.saving-message').text(t('files_texteditor', 'failed!'));
				} else {
					$('small.saving-message').text(message);
				}
				OCA.Files_Texteditor.saveMessageTimeout = setTimeout(function() {
					$('small.saving-message').fadeOut(200);
				}, 5000);
				OCA.Files_Texteditor.file.edited = true;
			}
		);
		OCA.Files_Texteditor.saving = false;
		window.aceEditor.focus();
	},

	/**
	 * Handles on close button click
	 */
	_onCloseTrigger: function() {
		// Hide or close?
		if(!OCA.Files_Texteditor.file.edited) {
			OCA.Files_Texteditor.closeEditor();
		} else {
			// Trick the autosave attempt into thinking we have no changes
			OCA.Files_Texteditor.file.edited = false;
			// Hide the editor
			OCA.Files_Texteditor.hideEditor();
			// Try to save
			OCA.Files_Texteditor.saveFile(
				window.aceEditor.getSession().getValue(),
				OCA.Files_Texteditor.file,
				function(data){
					OC.Notification.showTemporary(t(
						'files_texteditor',
						'Saved'
						)
					)
					// Remove the editor
					OCA.Files_Texteditor.closeEditor();
				},
				function(message){
					OC.Notification.showTemporary(t(
						'files_texteditor',
						'There was a problem saving your changes. Click to resume editing.'
						)
					);
					$('#notification').data('reopeneditor', true).on(
						'click',
						OCA.Files_Texteditor._onReOpenTrigger
					);
					OCA.Files_Texteditor.file.edited = true;
				}
			);
		}
	},

	/**
	 * Handles the trigger or re open editor
	 */
	_onReOpenTrigger: function() {
		if($('#notification').data('reopeneditor') == true) {
			document.title = OCA.Files_Texteditor.file.name + ' - ' + OCA.Files_Texteditor.oldTitle;
			OCA.Files_Texteditor.$container.show();
		}
	},

	/**
	 * Handles the FileAction click event
	 */
	_onEditorTrigger: function(filename, context) {
		this.currentContext = context;
		this.file.name = filename;
		this.file.dir = context.dir;
		this.fileInfoModel = context.fileList.getModelForFile(filename);
		this.loadEditor(
			OCA.Files_Texteditor.$container,
			OCA.Files_Texteditor.file
		);
		if(!$('html').hasClass('ie8')) {
			history.pushState({file:filename, dir:context.dir}, 'Editor', '#editor');
		}
	},

	/**
	 * Handler for edits detected
	 */
	_onEdit: function () {
		if(!OCA.Files_Texteditor.file.edited) {
			OCA.Files_Texteditor.file.edited = true;
			if(!OCA.Files_Texteditor.saving) {
				OCA.Files_Texteditor._onUnsaved();
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
	_onUnsaved: function() {
		document.title = '* '+ OCA.Files_Texteditor.file.name + ' - ' + OCA.Files_Texteditor.oldTitle;
		$('small.unsaved-star').css('display', 'inline-block');
	},

	/**
	 * Setup on page load
	 */
	initialize: function(container) {
		// Don't load if not in the files app TODO: Fix for sharing
		if(!$('#content.app-files').length) { return; }
		this.$container = container;
		this.registerFileActions();
		this.oldTitle = document.title;
		$.each(this.previewPlugins, function(mime, plugin) {
			plugin.init();
		});
	},

	/**
	 * Registers the file actions
	 */
	registerFileActions: function() {
		var mimes = Array(
			'text',
			'application/xml',
			'application/x-empty',
			'application/x-php',
			'application/javascript',
			'application/x-pearl',
			'application/x-text',
			'application/yaml'
		);

		_self = this;

		$.each(mimes, function(key, value) {
			OCA.Files.fileActions.registerAction({
				name: 'Edit',
				mime: value,
				actionHandler: _.bind(_self._onEditorTrigger, _self),
				permissions: OC.PERMISSION_READ,
				icon: function () {
					return OC.imagePath('core', 'actions/edit');
				}
			});
			OCA.Files.fileActions.setDefault(value, 'Edit');
		});

	},

	/**
	 * Actually fire up the editor in a container
	 */
	loadEditor: function(container, file) {
		var _self = this;
		// Insert the editor into the container
		container.html(
			'<div id="editor_overlay"></div>'
			+'<div id="editor_container" class="icon-loading">'
			+'<div id="editor_wrap"><div id="editor"></div>'
			+'<div id="preview_wrap"><div id="preview"></div></div></div></div>');
		$('#app-content').append(container);


		// Get the file data
		this.loadFile(
			file.dir,
			file.name,
			function(file, data){
				// Success!
				// Sort the title
				document.title = file.name + ' - ' + OCA.Files_Texteditor.oldTitle;
				// Load ace
				$('#'+_self.editor).text(data);
				// Remove loading
				$('#editor_container').removeClass('icon-loading');
				// Configure ace
				_self.configureACE(file);
				// Show the controls
				_self.loadControlBar(file, _self.currentContext);
				window.aceEditor.getSession().on('change', _self.setupAutosave);
				_self.bindVisibleActions();
				window.aceEditor.focus();

				if (_self.previewPlugins[file.mime]){
					_self.preview = container.find('#preview');
					_self.preview.addClass(file.mime.replace('/','-'));
					container.find('#editor_container').addClass('hasPreview');
					container.find('#editor_overlay').addClass('hasPreview');
					_self.previewPluginOnChange = _.debounce(_self.previewPlugins[file.mime].preview, 200);
					var text = window.aceEditor.getSession().getValue();
					_self.previewPluginOnChange(text, _self.preview);
					window.aceEditor.resize();
				} else {
					_self.previewPluginOnChange = null;
				}

				// IE8 support
				if(!OC.Util.hasSVGSupport()){ //replace all svg images with png images for browser that dont support svg
					OC.Util.replaceSVG();
				}
			},
			function(message){
				// Oh dear
				OC.dialogs.alert(message, t('files_texteditor', 'An error occurred!'));
				_self.closeEditor();
			});
	},

	/**
	 * Load the editor control bar
	 */
	loadControlBar: function(file, context) {
		var html =
			'<small class="filename">'+escapeHTML(file.name)+'</small>'
			+'<small class="unsaved-star" style="display: none">*</small>'
			+'<small class="saving-message">'
			+'</small>'
			+'<button id="editor_close" class="icon-close svg"></button>';
		var controlBar = $('<div id="editor_controls"></div>').html(html);
		$('#editor_wrap').before(controlBar);
		this.setFilenameMaxLength();
		this.bindControlBar();

	},

	/**
	 * Removes the control bar
	 */
	unloadControlBar: function() {
		$('#editor_controls').remove();
	},

	/**
	 * Set the max width of the filename to prevent wrapping
	 */
	setFilenameMaxLength: function() {
		// Get the width of the control bar
		var controlBar = $('#editor_controls').width();
		// Get the width of all of the other controls
		var controls = $('small.saving-message').outerWidth(true);
		controls += $('small.unsaved-star').outerWidth(true);
		controls += $('#editor_close').outerWidth(true);
		// Set the max width
		$('small.filename').css('max-width', controlBar-controls-28);
	},

	/**
	 * Binds the control events on the control bar
	 */
	bindControlBar: function() {
		var self = this;
		$('#editor_close').on('click', _.bind(this._onCloseTrigger, this));
		$(window).resize(OCA.Files_Texteditor.setFilenameMaxLength);
		if(!$('html').hasClass('ie8')) {
			window.onpopstate = function (e) {
				self._onCloseTrigger();
			}
		}
	},

	/**
	 * Configure the ACE editor
	 */
	configureACE: function(file) {
		window.aceEditor = ace.edit(this.editor);
		aceEditor.setShowPrintMargin(false);
		aceEditor.getSession().setUseWrapMode(true);
		if (!file.writeable) { aceEditor.setReadOnly(true); }
		if (file.mime && file.mime === 'text/html') {
			this.setEditorSyntaxMode('html');
		} else {
			// Set the syntax mode based on the file extension
			this.setEditorSyntaxMode(
				file.name.split('.')[file.name.split('.').length - 1]
			);
		}
		// Set the theme
		OC.addScript(
			'files_texteditor',
			'vendor/ace/src-noconflict/theme-clouds',
			function () {
				window.aceEditor.setTheme("ace/theme/clouds");
			}
		);
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
			exec: OCA.Files_Texteditor._onSaveTrigger
		});

		// disable Ctrl-T shortcut in ace to allow new tab feature in browser
		window.aceEditor.commands.removeCommand(window.aceEditor.commands.byName.transposeletters);
	},

	/**
	 * Sets the syntax highlighting for the editor based on the file extension
	 */
	setEditorSyntaxMode: function(extension) {
		// Loads the syntax mode files and tells the editor
		var filetype = new Array();
		// add file extensions like this: filetype["extension"] = "filetype":
		filetype["h"] = "c_cpp";
		filetype["c"] = "c_cpp";
		filetype["clj"] = "clojure";
		filetype["coffee"] = "coffee"; // coffescript can be compiled to javascript
		filetype["coldfusion"] = "cfc";
		filetype["cpp"] = "c_cpp";
		filetype["cs"] = "csharp";
		filetype["css"] = "css";
		filetype["groovy"] = "groovy";
		filetype["haxe"] = "hx";
		filetype["htm"] = "html";
		filetype["html"] = "html";
		filetype["tt"] = "html";
		filetype["java"] = "java";
		filetype["js"] = "javascript";
		filetype["jsm"] = "javascript";
		filetype["json"] = "json";
		filetype["latex"] = "latex";
		filetype["tex"] = "latex";
		filetype["less"] = "less";
		filetype["ly"] = "latex";
		filetype["ily"] = "latex";
		filetype["lua"] = "lua";
		filetype["markdown"] = "markdown";
		filetype["md"] = "markdown";
		filetype["mdown"] = "markdown";
		filetype["mdwn"] = "markdown";
		filetype["mkd"] = "markdown";
		filetype["ml"] = "ocaml";
		filetype["mli"] = "ocaml";
		filetype["pl"] = "perl";
		filetype["php"] = "php";
		filetype["powershell"] = "ps1";
		filetype["py"] = "python";
		filetype["rb"] = "ruby";
		filetype["scad"] = "scad"; // seems to be something like 3d model files printed with e.g. reprap
		filetype["scala"] = "scala";
		filetype["scss"] = "scss"; // "sassy css"
		filetype["sh"] = "sh";
		filetype["sql"] = "sql";
		filetype["svg"] = "svg";
		filetype["textile"] = "textile"; // related to markdown
		filetype["xml"] = "xml";

		if (filetype[extension] != null) {
			// Then it must be in the array, so load the custom syntax mode
			// Set the syntax mode
			OC.addScript(
				'files_texteditor',
				'vendor/ace/src-noconflict/mode-'+filetype[extension],
				function () {
					var SyntaxMode = ace.require("ace/mode/" + filetype[extension]).Mode;
					window.aceEditor.getSession().setMode(new SyntaxMode());
				}
			);
		}
	},

	/**
	 * Loads the data through AJAX
	 */
	loadFile: function(dir, filename, success, failure) {
		$.get(
			OC.generateUrl('/apps/files_texteditor/ajax/loadfile'),
			{
				filename: filename,
				dir: dir
			}
		).done(function(data) {
			// Call success callback
			OCA.Files_Texteditor.file.writeable = data.writeable;
			OCA.Files_Texteditor.file.mime = data.mime;
			OCA.Files_Texteditor.file.mtime = data.mtime;
			success(OCA.Files_Texteditor.file, data.filecontents);
		}).fail(function(jqXHR) {
			failure(JSON.parse(jqXHR.responseText).message);
		});
	},

	/**
	 * Send the new file data back to the server
	 */
	saveFile: function(data, file, success, failure) {
		// Send the post request
		if(file.dir == '/') {
			var path = file.dir + file.name;
		} else {
			var path = file.dir + '/' + file.name;
		}
		$.ajax({
			type: 'PUT',
			url: OC.generateUrl('/apps/files_texteditor/ajax/savefile'),
			data: {
				filecontents: data,
				path: path,
				mtime: file.mtime
			}
		})
		.done(success)
		.fail(function(jqXHR) {
			var message;

			try{
				message = JSON.parse(jqXHR.responseText).message;
			}catch(e){
			}

			failure(message);
		});
	},

	/**
	 * Close the editor for good
	 */
	closeEditor: function() {
		this.$container.html('').show();
		this.unloadControlBar();
		this.unBindVisibleActions();
		if (this.fileInfoModel) {
			this.fileInfoModel.set({
				// temp dummy, until we can do a PROPFIND
				etag: this.fileInfoModel.get('id') + this.file.mtime,
				mtime: this.file.mtime * 1000,
				size: this.file.size
			});
		}
		document.title = this.oldTitle;
	},

	/**
	 * Hide the editor (unsaved changes)
	 */
	hideEditor: function() {
		this.$container.hide();
		document.title = this.oldTitle;
		this.unBindVisibleActions();
	},

	/**
	 * Configure the autosave timer
	 */
	setupAutosave: function() {
		clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(OCA.Files_Texteditor._onSaveTrigger, 3000);
	},

	/**
	 * Handles event when clicking outside editor
	 */
	_onClickDocument: function(event) {
		// Check if click was inside the editor or not.
		if(!$(event.target).closest('#editor_container').length) {
		   // Edit the editor
		   OCA.Files_Texteditor._onCloseTrigger();
	   }
	},

	/*
	 * Binds actions that need to happen whilst the editor is visible
	 */
	 bindVisibleActions: function() {
		 $(document).bind('mouseup', this._onClickDocument);
	 },

	 /**
	  * Unbinds actions that happen whilst the editor is visible
	  */
	 unBindVisibleActions: function() {
		 $(document).unbind('mouseup', this._onClickDocument);
	 }

};

Files_Texteditor.NewFileMenuPlugin = {

	attach: function(menu) {
		var fileList = menu.fileList;

		// only attach to main file list, public view is not supported yet
		if (fileList.id !== 'files') {
			return;
		}

		// register the new menu entry
		menu.addMenuEntry({
			id: 'file',
			displayName: t('files_texteditor', 'Text file'),
			templateName: t('files_texteditor', 'New text file.txt'),
			iconClass: 'icon-filetype-text',
			fileType: 'file',
			actionHandler: function(name) {
				var dir = fileList.getCurrentDirectory();
				// first create the file
				fileList.createFile(name).then(function() {
					// once the file got successfully created,
					// open the editor
					Files_Texteditor._onEditorTrigger(
						name,
						{
							fileList: fileList,
							dir: dir
						}
					);
				});
			}
		});
	}
};

OCA.Files_Texteditor = Files_Texteditor;

OC.Plugins.register('OCA.Files.NewFileMenu', Files_Texteditor.NewFileMenuPlugin);

$(document).ready(function () {
	$('#editor').remove();
	OCA.Files_Texteditor.initialize($('<div id="app-content-texteditor"></div>'));
});
