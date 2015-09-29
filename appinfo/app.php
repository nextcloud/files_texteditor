<?php

// only load text editor if the user is logged in
if (\OCP\User::isLoggedIn()) {
	$eventDispatcher = \OC::$server->getEventDispatcher();
	$eventDispatcher->addListener('OCA\Files::loadAdditionalScripts', function() {
		OCP\Util::addStyle('files_texteditor', 'DroidSansMono/stylesheet');
		OCP\Util::addStyle('files_texteditor', 'style');
		OCP\Util::addStyle('files_texteditor', 'mobile');
		OCP\Util::addscript('files_texteditor', 'editor');
		OCP\Util::addscript('files_texteditor', 'vendor/ace/src-noconflict/ace');
	});
}

