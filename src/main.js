import TextEditor from './TextEditor.vue'

document.addEventListener("DOMContentLoaded", () => {
	OCA.Viewer.registerHandler({
		id: 'texteditor',

		// the list of mimes your component is able to display
		mimes: [
			"text/plain",
			"application/cmd",
			"application/javascript",
			"application/json",
			"application/xml",
			"application/x-empty",
			"application/x-msdos-program",
			"application/x-php",
			"application/x-perl",
			"application/x-text",
			"application/yaml",
		],

		component: TextEditor
	})
})
