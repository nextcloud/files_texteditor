<?php

// only load text editor if the user is logged in
if (\OCP\User::isLoggedIn()) {
	$eventDispatcher = \OC::$server->getEventDispatcher();
	$eventDispatcher->addListener('OCA\Files::loadAdditionalScripts', function() {
		OCP\Util::addStyle('files_texteditor', 'merged');
		OCP\Util::addScript('files_texteditor', 'merged');

		$cspManager = \OC::$server->getContentSecurityPolicyManager();
		$csp = new \OCP\AppFramework\Http\ContentSecurityPolicy();
		$csp->addAllowedChildSrcDomain("'self'");
		$cspManager->addDefaultPolicy($csp);
	});
}

