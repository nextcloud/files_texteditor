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


namespace OCA\FilesTextEditor\Tests\Controller;

use OC\HintException;
use OCA\FilesTextEditor\Controller\FileHandlingController;
use OCP\Files\File;
use OCP\Files\Folder;
use OCP\Files\ForbiddenException;
use OCP\IL10N;
use OCP\ILogger;
use OCP\IRequest;
use OCP\Lock\LockedException;
use Test\TestCase;

class FileHandlingControllerTest extends TestCase {
	/** @var FileHandlingController */
	protected $controller;

	/** @var string */
	protected $appName;

	/** @var IRequest|\PHPUnit_Framework_MockObject_MockObject */
	protected $requestMock;

	/** @var IL10N|\PHPUnit_Framework_MockObject_MockObject */
	private $l10nMock;

	/** @var ILogger|\PHPUnit_Framework_MockObject_MockObject */
	private $loggerMock;

	/** @var Folder|\PHPUnit_Framework_MockObject_MockObject */
	private $userFolderMock;

	protected function setUp(): void {
		parent::setUp();
		$this->appName = 'files_texteditor';
		$this->requestMock = $this->createMock(IRequest::class);
		$this->l10nMock = $this->createMock(IL10N::class);
		$this->loggerMock = $this->createMock(ILogger::class);
		$this->userFolderMock = $this->createMock(Folder::class);

		$this->l10nMock->expects($this->any())->method('t')->willReturnCallback(
			function ($message) {
				return $message;
			}
		);

		$this->controller = new FileHandlingController(
			$this->appName,
			$this->requestMock,
			$this->l10nMock,
			$this->loggerMock,
			$this->userFolderMock);
	}

	/**
	 * @dataProvider dataTestLoad
	 *
	 * @param string $filename
	 * @param string|boolean $fileContent
	 * @param integer $expectedStatus
	 * @param string $expectedMessage
	 */
	public function testLoad($filename, $fileContent, $expectedStatus, $expectedMessage) {
		$file = $this->createMock(File::class);
		$file->method('getContent')
			->willReturn($fileContent);
		$this->userFolderMock->method('get')
			->with('//'.$filename)
			->willReturn($file);

		$result = $this->controller->load('/', $filename);
		$data = $result->getData();
		$status = $result->getStatus();
		$this->assertSame($status, $expectedStatus);
		if ($status === 200) {
			$this->assertArrayHasKey('filecontents', $data);
			$this->assertArrayHasKey('writeable', $data);
			$this->assertArrayHasKey('mime', $data);
			$this->assertArrayHasKey('mtime', $data);
			$this->assertSame($data['filecontents'], $fileContent);
		} else {
			$this->assertArrayHasKey('message', $data);
			$this->assertSame($expectedMessage, $data['message']);
		}
	}

	public function dataTestLoad() {
		return array(
			array('test.txt', 'file content', 200, ''),
			array('test.txt', '', 200, ''),
			array('test.txt', '0', 200, ''),
			array('', 'file content', 400, 'Invalid file path supplied.'),
			array('test.txt', false, 400, 'Cannot read the file.'),
		);
	}

	public function dataLoadExceptionWithException() {
		return [
			[new \Exception(), 'An internal server error occurred.'],
			[new HintException('error message', 'test exception'), 'test exception'],
			[new ForbiddenException('firewall', false), 'firewall'],
			[new LockedException('secret/path/https://github.com/owncloud/files_texteditor/pull/96'), 'The file is locked.'],
		];
	}

	/**
	 * @dataProvider dataLoadExceptionWithException
	 * @param \Exception $exception
	 * @param string $expectedMessage
	 */
	public function testLoadExceptionWithException(\Exception $exception, $expectedMessage) {
		$file = $this->createMock(File::class);
		$file->method('getContent')
			->willThrowException($exception);
		$this->userFolderMock->method('get')
			->with('//test.txt')
			->willReturn($file);

		$result = $this->controller->load('/', 'test.txt');
		$data = $result->getData();

		$this->assertSame(400, $result->getStatus());
		$this->assertArrayHasKey('message', $data);
		$this->assertSame($expectedMessage, $data['message']);
	}

	/**
	 * @dataProvider dataLoadExceptionWithException
	 * @param \Exception $exception
	 * @param string $expectedMessage
	 */
	public function testSaveExceptionWithException(\Exception $exception, $expectedMessage) {
		$file = $this->createMock(File::class);
		$file->method('putContent')
			->willThrowException($exception);
		$this->userFolderMock->method('get')
			->with('/test.txt')
			->willReturn($file);

		$file->method('getMTime')->willReturn(42);
		$file->method('isUpdateable')->willReturn(true);

		$result = $this->controller->save('/test.txt', 'content', 42);
		$data = $result->getData();

		$this->assertSame(400, $result->getStatus());
		$this->assertArrayHasKey('message', $data);
		$this->assertSame($expectedMessage, $data['message']);
	}

	/**
	 * @dataProvider dataTestSave
	 *
	 * @param $path
	 * @param $fileContents
	 * @param $mTime
	 * @param $fileMTime
	 * @param $isUpdatable
	 * @param $expectedStatus
	 * @param $expectedMessage
	 */
	public function testSave($path, $fileContents, $mTime, $fileMTime, $isUpdatable, $expectedStatus, $expectedMessage) {
		$file = $this->createMock(File::class);
		$this->userFolderMock->method('get')
			->with('/test.txt')
			->willReturn($file);

		$file->method('getMTime')->willReturn($fileMTime);
		$file->method('isUpdateable')->willReturn($isUpdatable);

		if ($expectedStatus === 200) {
			$file->expects($this->once())
				->method('putContent')->with($fileContents);
		} else {
			$file->expects($this->never())->method('putContent');
		}

		$result = $this->controller->save($path, $fileContents, $mTime);
		$status = $result->getStatus();
		$data = $result->getData();

		$this->assertSame($expectedStatus, $status);
		if ($status === 200) {
			$this->assertArrayHasKey('mtime', $data);
			$this->assertArrayHasKey('size', $data);
		} else {
			$this->assertArrayHasKey('message', $data);
			$this->assertSame($expectedMessage, $data['message']);
		}
	}

	public function testFileTooBig() {
		$file = $this->createMock(File::class);
		$this->userFolderMock->method('get')
			->with('//foo.bar')
			->willReturn($file);
		$file->method('getSize')->willReturn(4194304 + 1);

		$result = $this->controller->load('/', 'foo.bar');
		$data = $result->getData();
		$status = $result->getStatus();
		$this->assertSame(400, $status);
		$this->assertArrayHasKey('message', $data);
		$this->assertSame('This file is too big to be opened. Please download the file instead.', $data['message']);
	}

	public function dataTestSave() {
		return array(
			array('/test.txt', 'file content', 65638643, 65638643, true, 200, ''),
			array('', 'file content', 65638643, 65638643, true, 400, 'File path not supplied'),
			array('/test.txt', 'file content', '', 65638643, true, 400, 'File mtime not supplied'),
			array('/test.txt', 'file content', 0, 65638643, true, 400, 'File mtime not supplied'),
			array('/test.txt', 'file content', 65638643, 32848548, true, 400, 'Cannot save file as it has been modified since opening'),
			array('/test.txt', 'file content', 65638643, 65638643, false, 400, 'Insufficient permissions'),
		);
	}
}
