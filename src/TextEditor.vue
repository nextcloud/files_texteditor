<template>
	<AceEditor
		v-if="sourceContent"
		v-model="content"
		@init="editorInit"
		lang="javascript"
		theme="monokai"
		width="100%"
		height="100%"
		:options="{
			enableBasicAutocompletion: true,
			enableLiveAutocompletion: true,
			fontSize: 14,
			highlightActiveLine: true,
			enableSnippets: true,
			showLineNumbers: true,
			tabSize: 2,
			showPrintMargin: false,
			showGutter: true,
		}"
		:commands="[
			{
				name: 'save',
				bindKey: { win: 'Ctrl-s', mac: 'Command-s' },
				exec: dataSubmit,
				readOnly: true,
			},
		]"
	/>
</template>

<script>
import axios from '@nextcloud/axios'
import AceEditor from 'vuejs-ace-editor';

export default {
	name: 'TextEditor',

	components: {
		AceEditor
	},

	props: {},

	data () {
		return {
			content: "default content",
		}
	},

	computed: {
		src () {
			return this.source ?? this.davPath
		},
	},

	asyncComputed: {
		async sourceContent () {
			if (!this.src) {
				return ''
			}
			const file = await axios.get(this.src)
			this.content = file.data;
			this.doneLoading();
			return file.data
		},
	},

	watch: {

	},
	methods: {
		/**
		 * This is used to make the viewer know this file is complete or ready
		 * ! you NEED to use it to make the viewer aware of the current loading state
		 */
		doneLoading() {
			// send the current state
			this.$emit('update:loaded', true)
		},

		dataSubmit () {
			console.error("save")
		},
		editorInit: function () {
			// require('brace/ext/language_tools') //language extension prerequsite...
			// require('brace/mode/html')
			// require('brace/mode/javascript')    //language
			// require('brace/mode/less')
			// require('brace/theme/monokai')
			// require('brace/snippets/javascript') //snippet
		}
	},
}
</script>

<style scoped lang="scss">

</style>
