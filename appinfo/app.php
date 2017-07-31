<?php

$eventDispatcher = \OC::$server->getEventDispatcher();

// only load text editor if the user is logged in
if (\OC::$server->getUserSession()->isLoggedIn()) {
	$eventDispatcher->addListener('OCA\Files::loadAdditionalScripts', function() {
		OCP\Util::addStyle('files_texteditor', 'merged');
		OCP\Util::addScript('files_texteditor', 'merged');

		$cspManager = \OC::$server->getContentSecurityPolicyManager();
		$csp = new \OCP\AppFramework\Http\ContentSecurityPolicy();
		$csp->addAllowedChildSrcDomain("'self'");
		$cspManager->addDefaultPolicy($csp);
	});
}

$eventDispatcher->addListener('OCA\Files_Sharing::loadAdditionalScripts', function() {
	OC_Util::addVendorScript('core', 'marked/marked.min');
	OCP\Util::addScript('files_texteditor', 'public-share');
	OCP\Util::addStyle('files_texteditor', 'public-share');
});
