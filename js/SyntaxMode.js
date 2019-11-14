const filetype = {};
// add file extensions like this: filetype["extension"] = "filetype":
filetype["bat"] = "batchfile";
filetype["cmd"] = "batchfile";
filetype["h"] = "c_cpp";
filetype["c"] = "c_cpp";
filetype["clj"] = "clojure";
filetype["coffee"] = "coffee"; // coffescript can be compiled to javascript
filetype["cpp"] = "c_cpp";
filetype["cs"] = "csharp";
filetype["css"] = "css";
filetype["groovy"] = "groovy";
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
filetype["ps1"] = "powershell";
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

const loaders = {};
// add loader like this: loaders["filetype"] = () => require("promise?brace/mode/filetype"):

// note that these require statements can't be generated from the filetypes dynamically
// to make sure webpack can analyse our dependencies
loaders["batchfile"] = () => import(
	/* webpackChunkName: "bat-mode" */
	"brace/mode/batchfile"
	);
loaders["c_cpp"] = () => import(
	/* webpackChunkName: "h-mode" */
	"brace/mode/c_cpp"
	);
loaders["coffee"] = () => import
	/* webpackChunkName: "coffee-mode" */(
	"brace/mode/coffee"
	);
loaders["csharp"] = () => import(
	/* webpackChunkName: "cs-mode" */
	"brace/mode/csharp"
	);
loaders["clojure"] = () => import(
	/* webpackChunkName: "clj-mode" */
	"brace/mode/clojure"
	);
loaders["css"] = () => import(
	/* webpackChunkName: "css-mode" */
	"brace/mode/css"
	);
loaders["groovy"] = () => import
	/* webpackChunkName: "groovy-mode" */(
	"brace/mode/groovy"
	);
loaders["html"] = () => import(
	/* webpackChunkName: "html-mode" */
	"brace/mode/html"
	);
loaders["java"] = () => import(
	/* webpackChunkName: "java-mode" */
	"brace/mode/java"
	);
loaders["javascript"] = () => import(
	/* webpackChunkName: "js-mode" */
	"brace/mode/javascript"
	);
loaders["json"] = () => import(
	/* webpackChunkName: "json-mode" */
	"brace/mode/json"
	);
loaders["latex"] = () => import(
	/* webpackChunkName: "latex-mode" */
	"brace/mode/latex"
	);
loaders["less"] = () => import(
	/* webpackChunkName: "less-mode" */
	"brace/mode/less"
	);
loaders["lua"] = () => import(
	/* webpackChunkName: "lua-mode" */
	"brace/mode/lua"
	);
loaders["markdown"] = () => import(
	/* webpackChunkName: "markdown-mode" */
	"brace/mode/markdown"
	);
loaders["ocaml"] = () => import(
	/* webpackChunkName: "ml-mode" */
	"brace/mode/ocaml"
	);
loaders["perl"] = () => import(
	/* webpackChunkName: "pl-mode" */
	"brace/mode/perl"
	);
loaders["php"] = () => import(
	/* webpackChunkName: "php-mode" */
	"brace/mode/php"
	);
loaders["powershell"] = () => import(
	/* webpackChunkName: "ps1-mode" */
	"brace/mode/powershell"
	);
loaders["python"] = () => import(
	/* webpackChunkName: "py-mode" */
	"brace/mode/python"
	);
loaders["ruby"] = () => import(
	/* webpackChunkName: "rb-mode" */
	"brace/mode/ruby"
	);
loaders["scad"] = () => import(
	/* webpackChunkName: "scad-mode" */
	"brace/mode/scad"
	); // seems to be something like 3d model files printed with e.g. reprap
loaders["scala"] = () => import(
	/* webpackChunkName: "scala-mode" */
	"brace/mode/scala"
	);
loaders["scss"] = () => import(
	/* webpackChunkName: "scss-mode" */
	"brace/mode/scss"); // "sassy css"
loaders["sh"] = () => import(
	/* webpackChunkName: "sh-mode" */
	"brace/mode/sh"
	);
loaders["sql"] = () => import(
	/* webpackChunkName: "sql-mode" */
	"brace/mode/sql"
	);
loaders["svg"] = () => import(
	/* webpackChunkName: "svg-mode" */
	"brace/mode/svg"
	);
loaders["textile"] = () => import(
	/* webpackChunkName: "textile-mode" */
	"brace/mode/textile"); // related to markdown
loaders["xml"] = () => import(
	/* webpackChunkName: "xml-mode" */
	"brace/mode/xml"
	);

export function getSyntaxMode (extension) {
	const type = filetype[extension];
	if (type) {
		// Then it must be in the array, so load the custom syntax mode
		// Set the syntax mode
		return loaders[type]().then(() => {
			return type;
		});
	}

	return $.when();
}
