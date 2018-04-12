<?php
/**
 * @copyright 2017, Roeland Jago Douma <roeland@famdouma.nl>
 *
 * @author Roeland Jago Douma <roeland@famdouma.nl>
 *
 * @license GNU AGPL version 3 or any later version
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
namespace OCA\FilesTextEditor\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataResponse;
use OCP\Files\Folder;
use OCP\Files\NotFoundException;
use OCP\IL10N;
use OCP\IRequest;
use OCP\ISession;
use OCP\Share\Exceptions\ShareNotFound;
use OCP\Share\IManager as ShareManager;

class PublicFileHandlingController extends Controller{

	/** @var IL10N */
	private $l;

	/** @var ShareManager */
	private $shareManager;

	/** @var ISession */
	private $session;

	/**
	 *
	 * @param string $AppName
	 * @param IRequest $request
	 * @param IL10N $l10n
	 * @param ShareManager $shareManager
	 * @param ISession $session
	 */
	public function __construct($AppName,
								IRequest $request,
								IL10N $l10n,
								ShareManager $shareManager,
								ISession $session) {
		parent::__construct($AppName, $request);
		$this->l = $l10n;
		$this->shareManager = $shareManager;
		$this->session = $session;
	}

	/**
	 * load text file
	 *
	 * @NoAdminRequired
	 * @PublicPage
	 * @NoCSRFRequired
	 *
	 * @param string $token
	 * @return DataResponse
	 */
	public function load($token) {
		try {
			$share = $this->shareManager->getShareByToken($token);
		} catch (ShareNotFound $e) {
			return new DataResponse(['message' => $this->l->t('Share not found'), Http::STATUS_NOT_FOUND]);
		}

		if ($share->getPassword() !== null &&
			(!$this->session->exists('public_link_authenticated')
			|| $this->session->get('public_link_authenticated') !== (string)$share->getId())) {
			return new DataResponse(['message' => $this->l->t('You are not authorized to open this share'), Http::STATUS_BAD_REQUEST]);
		}

		try {
			$node = $share->getNode();
		} catch (NotFoundException $e) {
			return new DataResponse(['message' => $this->l->t('Share not found'), Http::STATUS_NOT_FOUND]);
		}

		if ($node instanceof Folder) {
			return new DataResponse(['message' => $this->l->t('You can not open a folder')], Http::STATUS_BAD_REQUEST);
		}

		$range = $this->request->getHeader('Range');
		if ($range !== '') {
			$matches = [];
			if (preg_match('/bytes=0-(\d+)$/', $range, $matches) === 0) {
				return new DataResponse(['message' => $this->l->t('Invalid range request')], Http::STATUS_REQUEST_RANGE_NOT_SATISFIABLE);
			}
			$range = (int)$matches[1];
		} else {
			$range = -1;
		}

		// default of 4MB
		$maxSize = 4194304;
		if ($node->getSize() > $maxSize) {
			return new DataResponse(['message' => $this->l->t('This file is too big to be opened. Please download the file instead.')], Http::STATUS_BAD_REQUEST);
		}

		$fileContents = $node->getContent();
		if ($fileContents !== false) {
			$encoding = mb_detect_encoding($fileContents . 'a', 'UTF-8, WINDOWS-1252, ISO-8859-15, ISO-8859-1, ASCII', true);
			if ($encoding === '') {
				// set default encoding if it couldn't be detected
				$encoding = 'ISO-8859-15';
			}
			$fileContents = iconv($encoding, 'UTF-8', $fileContents);

			if ($range !== -1) {
				$fileContents = mb_substr($fileContents, 0, $range);
			}

			return new Http\DataDisplayResponse(
				$fileContents,
				Http::STATUS_OK,
				['Content-Type' => 'text/plain; charset="utf-8"']
			);
		}

		return new DataResponse(['message' => $this->l->t('Cannot read the file.')], Http::STATUS_BAD_REQUEST);
	}
}
