<?php

$eventDispatcher = \OC::$server->getEventDispatcher();

// only load text editor if the user is logged in
if (\OC::$server->getUserSession()->isLoggedIn()) {
	$eventDispatcher->addListener('OCA\Files::loadAdditionalScripts', function () {
		OCP\Util::addStyle('files_texteditor', 'merged');
		OCP\Util::addScript('files_texteditor', '../build/editor');

		$cspManager = \OC::$server->getContentSecurityPolicyManager();
		$csp = new \OCP\AppFramework\Http\ContentSecurityPolicy();
		$csp->addAllowedWorkerSrcDomain("'self'");
		$csp->addAllowedScriptDomain('blob:');
		$cspManager->addDefaultPolicy($csp);
	});
}

$eventDispatcher->addListener('OCA\Files_Sharing::loadAdditionalScripts', function () {
	OCP\Util::addScript('files_texteditor', '../build/public-share');
	OCP\Util::addStyle('files_texteditor', 'public-share');
});
