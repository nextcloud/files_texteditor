<?php

// only load text editor if the user is logged in
if (\OCP\User::isLoggedIn()) {
	$request = \OC::$server->getRequest();

	if (isset($request->server['REQUEST_URI'])) {
		$url = $request->server['REQUEST_URI'];
		if (preg_match('%index.php/apps/files(/.*)?%', $url)	|| preg_match('%index.php/s/(/.*)?%', $url)) {	
			OCP\Util::addStyle('files_texteditor', 'DroidSansMono/stylesheet');
			OCP\Util::addStyle('files_texteditor', 'style');
			OCP\Util::addStyle('files_texteditor', 'mobile');
			OCP\Util::addscript('files_texteditor', 'editor');
			OCP\Util::addscript('files_texteditor', 'vendor/ace/src-noconflict/ace');
		}
	}
}
