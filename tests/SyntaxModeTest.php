<?php

/**
 * @author Robin Windey <ro.windey@gmail.com>
 *
 * @copyright Copyright (c) 2019 Robin Windey <ro.windey@gmail.com>
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

namespace OCA\FilesTextEditor\Tests;

use Test\TestCase;

class SyntaxModeTest extends TestCase {
	protected function setUp(): void {
		parent::setUp();
	}

	public function testJsSyntax() {
		/*
		*   Make sure that the SyntaxMode.js file
		*   has a loader for every defined filetype.
		*   filetype["bat"] = "batchfile"; -> loaders["batchfile"] = ...
		*/
		$jsContent = file_get_contents('../js/SyntaxMode.js');
		preg_match_all('/^(?!\/\/.*$)filetype\[.*?\].*?=.*?"(.*?)"/m', $jsContent, $matches);

		$fileTypes = $matches[1];
		foreach ($fileTypes as $fileType) {
			$loaderDefined = preg_match('/loaders\["' . $fileType . '"\]/', $jsContent);
			$this->assertSame($loaderDefined, 1);
		}
	}
}
