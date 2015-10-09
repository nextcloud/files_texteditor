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


namespace OCA\Files_Texteditor\Tests\Controller;


use OC\HintException;
use OCA\Files_Texteditor\Controller\FileHandlingController;
use Test\TestCase;

class FileHandlingControllerTest extends TestCase {

	/** @var FileHandlingController */
	protected $controller;

	/** @var string */
	protected $appName;

	/** @var \OCP\IRequest | \PHPUnit_Framework_MockObject_MockObject */
	protected $requestMock;

	/** @var \OCP\IL10N | \PHPUnit_Framework_MockObject_MockObject */
	private $l10nMock;

	/** @var \OCP\ILogger | \PHPUnit_Framework_MockObject_MockObject */
	private $loggerMock;

	/** @var \OC\Files\View | \PHPUnit_Framework_MockObject_MockObject */
	private $viewMock;

	public function setUp() {
		parent::setUp();
		$this->appName = 'files_texteditor';
		$this->requestMock = $this->getMockBuilder('OCP\IRequest')
			->disableOriginalConstructor()
			->getMock();
		$this->l10nMock = $this->getMockBuilder('OCP\IL10N')
			->disableOriginalConstructor()
			->getMock();
		$this->loggerMock = $this->getMockBuilder('OCP\ILogger')
			->disableOriginalConstructor()
			->getMock();
		$this->viewMock = $this->getMockBuilder('OC\Files\View')
			->disableOriginalConstructor()
			->getMock();

		$this->l10nMock->expects($this->any())->method('t')->willReturnCallback(
			function($message) {
				return $message;
			}
		);

		$this->controller = new FileHandlingController(
			$this->appName,
			$this->requestMock,
			$this->l10nMock,
			$this->viewMock,
			$this->loggerMock);
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
		$this->viewMock->expects($this->any())
			->method('file_get_contents')
			->willReturn($fileContent);

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

	public function testLoadExceptionWithNoHint() {

		$exceptionHint = 'test exception';

		$this->viewMock->expects($this->any())
			->method('file_get_contents')
			->willReturnCallback(function() use ($exceptionHint) {
				throw new \Exception();
			});

		$result = $this->controller->load('/', 'test.txt');
		$data = $result->getData();

		$this->assertSame(400, $result->getStatus());
		$this->assertArrayHasKey('message', $data);
		$this->assertSame('An internal server error occurred.', $data['message']);
	}

	public function testLoadExceptionWithHint() {

		$exceptionHint = 'test exception';

		$this->viewMock->expects($this->any())
			->method('file_get_contents')
			->willReturnCallback(function() use ($exceptionHint) {
				throw new HintException('error message', $exceptionHint);
			});

		$result = $this->controller->load('/', 'test.txt');
		$data = $result->getData();

		$this->assertSame(400, $result->getStatus());
		$this->assertArrayHasKey('message', $data);
		$this->assertSame($exceptionHint, $data['message']);
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

		$this->viewMock->expects($this->any())
			->method('filemtime')
			->willReturn($fileMTime);

		$this->viewMock->expects($this->any())
			->method('isUpdatable')
			->willReturn($isUpdatable);

		if ($expectedStatus === 200) {
			$this->viewMock->expects($this->once())
				->method('file_put_contents')->with($path, $fileContents);
		} else {
			$this->viewMock->expects($this->never())->method(('file_put_contents'));
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
		$this->viewMock->expects($this->any())
			->method('filesize')
			->willReturn(4194304 + 1);

		$result = $this->controller->load('/', 'foo.bar');
		$data = $result->getData();
		$status = $result->getStatus();
		$this->assertSame(400, $status);
		$this->assertArrayHasKey('message', $data);
		$this->assertSame('This file is too big to be opened. Please download the file instead.', $data['message']);
	}

	public function dataTestSave() {
		return array (
			array('/test.txt', 'file content', 65638643, 65638643, true, 200, ''),
			array('', 'file content', 65638643, 65638643, true, 400, 'File path not supplied'),
			array('/test.txt', 'file content', '', 65638643, true, 400, 'File mtime not supplied'),
			array('/test.txt', 'file content', 0, 65638643, true, 400, 'File mtime not supplied'),
			array('/test.txt', 'file content', 65638643, 32848548, true, 400, 'Cannot save file as it has been modified since opening'),
			array('/test.txt', 'file content', 65638643, 65638643, false, 400, 'Insufficient permissions'),
		);
	}

}
