/**
 * Text Editor
 * Version 2.0 Alpha
 *
 * Known bugs:
 * - Title incorrect after closing editor
 * - No feedback for successful save
 * - JS files are loaded on all web requests
 * - No feedback on loading
 * - No limit to text filesize
 * - No check for file save size
 * - Filename is not shown in the breadcrumb
 *
 * Ideas:
 * - Autosave
 * - 2px #eee solid border below editor controls
 */

var Files_Texteditor = {
	
	/**
	 * Holds the editor contianer
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
		mime: null
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

	/*
	 * Save handler, triggered by the button, or keyboard
	 */
	_onSaveTrigger: function() {
		// Don't save if not edited		
		if(!OCA.Files_Texteditor.file.edited) { return; }
		// Don't try to save twice
		if(OCA.Files_Texteditor.saving) { return; } else {
			OCA.Files_Texteditor.saving = true;
			OCA.Files_Texteditor.edited = false;
		}
		// Set the saving status
		$('#editor_save').addClass('icon-loading').width($('#editor_save').width()).text('');
		// Send to server
		OCA.Files_Texteditor.saveFile(
			window.aceEditor.getSession().getValue(),
			OCA.Files_Texteditor.file,
			function(newmtime){
				// Yay
				// TODO only reset edited value if not editing during saving
				document.title = document.title.slice(2);
				$('#editor_container small.filename').text($('#editor_container small.filename').text().slice(2));
				OCA.Files_Texteditor.file.mtime = newmtime;
				OCA.Files_Texteditor.file.edited = false;
				$('#editor_save').removeClass('icon-loading').text(t('files_texteditor', 'Save'));
				$('#editor_controls small.lastsaved').text(('files_texteditor', 'Last saved: ')+moment().fromNow());
			},
			function(message){
				// Boo
				OC.Notification.showTemporary(t('files_texteditor', 'There was an error saving the file. Please try again.'));
				$('#editor_save').removeClass('icon-loading').text(t('files_texteditor', 'Save'));
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
			OC.Notification.showTemporary(t('files_texteditor', 'There were unsaved changes, click here to go back'));
			$('#notification').data('reopeneditor', true).on('click', OCA.Files_Texteditor._onReOpenTrigger);
			OCA.Files_Texteditor.hideEditor();
		}
	},

	/**
	 * Handles the trigger or re open editor
	 */
	_onReOpenTrigger: function() {
		if($('#notification').data('reopeneditor') == true) {
			alert('todo'); // TODO
		}
	},

	/**
	 * Handles the FileAction click event
	 */
	_onEditorTrigger: function(filename, context) {
		OCA.Files_Texteditor.currentContext = context;
		OCA.Files_Texteditor.file.name = filename;
		OCA.Files_Texteditor.file.dir = context.dir;
		OCA.Files_Texteditor.loadEditor(OCA.Files_Texteditor.$container, OCA.Files_Texteditor.file);
		history.pushState({file:filename, dir:context.dir}, 'Editor', '#editor');
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
	},

	/**
	 * Handler when unsaved work is detected
	 */
	_onUnsaved: function() {
		document.title = '* '+document.title;
		$('#editor_container small.filename').text('* '+$('#editor_container small.filename').text());
	},

	/**
	 * Handles the search box keyup event
	 */
	 _onSearchKeyup: function(event) {
		// if(!is_editor_shown) { return; } TODO replace this with appropriate replacement
		if($('#searchbox').val() == '') {
			// Hide clear button
			window.aceEditor.gotoLine(0);
			$('#editor_next').remove();
		} else {
			// New search
			// Reset cursor
			window.aceEditor.gotoLine(0);
			// Do search
			window.aceEditor.find($('#searchbox').val(), {
				backwards: false,
				wrap: false,
				caseSensitive: false,
				wholeWord: false,
				regExp: false
			});
			// Show next and clear buttons
			// check if already there
			if ($('#editor_next').length == 0) {
				var nextbtnhtml = '<button id="editor_next">' + t('files_texteditor', 'Next') + '</button>';
				$('#editor_save').after(nextbtnhtml);
			}
		}						
	 },

	initialize: function(container) {
		// Don't load if not in the files app TODO: Fix for sharing
		if(!$('#content.app-files').length) { return; }
		this.$container = container;
		this.registerFileActions();
		this.oldTitle = document.title;
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
			'application/x-text'
		);

		_self = this;

		$.each(mimes, function(key, value) {
			OCA.Files.fileActions.registerAction({
				name: 'Edit',
				mime: value,
				actionHandler: _self._onEditorTrigger,
				permissions: OC.PERMISSION_READ
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
		container.html('<div id="editor_overlay"></div><div id="editor_container" class="icon-loading"><div id="editor"></div></div>');
		$('#app-content').append(container);

		// Get the file data
		this.loadFile(
			file.dir,
			file.name,
			function(file, data){
				// Success!
				// Sort the title
				document.title = file.name + ' - ' + document.title;
				// Load ace
				$('#'+_self.editor).text(data);
				// Configure ace
				_self.configureACE(file);
				// Show the controls
				_self.loadControlBar(file, _self.currentContext);
				//window.aceEditor.getSession().on('change', _self.setupAutosave);
				window.aceEditor.focus();
			},
			function(message){
				// Oh dear
				OC.dialogs.alert(message, t('files_texteditor', 'An error occurred!'));
			});
	},

	/**
	 * Load the editor control bar
	 */
	loadControlBar: function(file, context) {
		var html = '<small class="filename">'+file.name+'</small><button id="editor_save">' + t('files_texteditor', 'Save') + '</button><small class="lastsaved">Last saved: Never</small>';
		html += '<button id="editor_close" class="icon-close svg"></button>';
		var controlBar = $('<div id="editor_controls"></div>').html(html);
		$('#'+this.editor).before(controlBar);
		this.bindControlBar();
	},

	/**
	 * Removes the contorl bar
	 */
	unloadControlBar: function() {
		$('#editor_controls').remove();
	},

	/**
	 * Binds the control events on the control bar
	 */
	bindControlBar: function() {
		$('#editor_close').on('click', this._onCloseTrigger);
		$('#editor_save').on('click', this._onSaveTrigger);
		$('#searchbox').on('input', this._onSearchKeyup);
		$('#content').on('click', '#editor_next', function() {
			window.aceEditor.findNext();
		});
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
			this.setEditorSyntaxMode(file.name.split('.')[file.name.split('.').length - 1]);
		}
		// Set the theme
		OC.addScript('files_texteditor', 'vendor/ace/src-noconflict/theme-clouds', function () {
			window.aceEditor.setTheme("ace/theme/clouds");
		});
		// Bind the edit event
		window.aceEditor.getSession().on('change', this._onEdit);
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
			OC.addScript('files_texteditor', 'vendor/ace/src-noconflict/mode-' + filetype[extension], function () {
				var SyntaxMode = ace.require("ace/mode/" + filetype[extension]).Mode;
				window.aceEditor.getSession().setMode(new SyntaxMode());
			});
		}
	},

	/*
	 * Loads the data through AJAX
	 */
	loadFile: function(dir, filename, success, failure) {
		var _self = this;
		var data = $.getJSON(
			OC.filePath('files_texteditor', 'ajax', 'loadfile.php'),
			{file: filename, dir: dir},
			function (result) {
				if(result.status === 'success') {
					// Call success callback
					OCA.Files_Texteditor.file.writeable = result.data.writeable;
					OCA.Files_Texteditor.file.mime = result.data.mime;
					OCA.Files_Texteditor.file.mtime = result.data.mtime;
					success(OCA.Files_Texteditor.file, result.data.filecontents);
				} else {
					// Call failure callback
					failure(result.data.message);
				}
		});
	},

	/*
	 * Send the new file data back to the server
	 */
	saveFile: function(data, file, success, failure) {
		// Send the post request
		$.post(
			OC.filePath('files_texteditor', 'ajax', 'savefile.php'),
			{
				filecontents: data,
				path: file.dir+'/'+file.name,
				mtime: file.mtime
			},
			function (json) {
				if (json.status != 'success') {
					failure(json.data.message);
				} else {
					success(json.data.mtime);
				}
			},
			'json'
		);
	},

	/**
	 * Close the editor for good
	 */
	closeEditor: function() {
		if(window.FileList) { window.FileList.reload(); }
		this.$container.html('');
		this.unloadControlBar();
		document.title = this.oldTitle;
	},

	/** 
	 * Hide the editor (unsaved changes)
	 */
	hideEditor: function() {
		this.$container.hide();
		this.unloadControlBar();
		document.title = this.oldTitle;
	},

	/**
	 * Re opens the editor
	 */
	reOpenEditor: function() {
		this.$container.show();
	}


	/**
	 * Configure the autosave timer
	 */
	//setupAutosave: function() {
	//	clearTimeout(this.saveTimer);
	//	this.saveTimer = setTimeout(OCA.Files_Texteditor._onSaveTrigger, 3000);
	//}

}

OCA.Files_Texteditor = Files_Texteditor;

$(document).ready(function () {
	$('#editor').remove();
	OCA.Files_Texteditor.initialize($('<div id="app-content-texteditor"></div>'));
});