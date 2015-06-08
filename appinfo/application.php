<?php
/**
 * @author Björn Schießle <schiessle@owncloud.com>
 *
 * @copyright Copyright (c) 2015, ownCloud, Inc.
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License, version 3,
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License, version 3,
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 *
 */


namespace OCA\Files_Texteditor\AppInfo;

use OC\Files\View;
use OCA\Files_Texteditor\Controller\FileHandlingController;
use OCP\AppFramework\App;
use OCP\AppFramework\IAppContainer;
use Punic\Exception;

class Application extends App {

	/**
	 * @param array $urlParams
	 */
	public function __construct(array $urlParams = array()) {
		parent::__construct('files_texteditor', $urlParams);

		$container = $this->getContainer();
		$server = $container->getServer();

		$container->registerService('FileHandlingController', function (IAppContainer $c) use ($server) {
			$user = $server->getUserSession()->getUser();
			if ($user) {
				$uid = $user->getUID();
			} else {
				throw new \BadMethodCallException('no user logged in');
			}
			return new FileHandlingController(
				$c->getAppName(),
				$server->getRequest(),
				$server->getL10N($c->getAppName()),
				new View('/' . $uid . '/files'),
				$server->getLogger()
			);
		});
	}
}
