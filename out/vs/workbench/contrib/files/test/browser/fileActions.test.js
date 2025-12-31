/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { incrementFileName } from '../../browser/fileActions.js';
suite('Files - Increment file name simple', () => {
    test('Increment file name without any version', function () {
        const name = 'test.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy.js');
    });
    test('Increment file name with suffix version', function () {
        const name = 'test copy.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy 2.js');
    });
    test('Increment file name with suffix version with leading zeros', function () {
        const name = 'test copy 005.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy 6.js');
    });
    test('Increment file name with suffix version, too big number', function () {
        const name = 'test copy 9007199254740992.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy 9007199254740992 copy.js');
    });
    test('Increment file name with just version in name', function () {
        const name = 'copy.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'copy copy.js');
    });
    test('Increment file name with just version in name, v2', function () {
        const name = 'copy 2.js';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'copy 2 copy.js');
    });
    test('Increment file name without any extension or version', function () {
        const name = 'test';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy');
    });
    test('Increment file name without any extension or version, trailing dot', function () {
        const name = 'test.';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy.');
    });
    test('Increment file name without any extension or version, leading dot', function () {
        const name = '.test';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, '.test copy');
    });
    test('Increment file name without any extension or version, leading dot v2', function () {
        const name = '..test';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, '. copy.test');
    });
    test('Increment file name without any extension but with suffix version', function () {
        const name = 'test copy 5';
        const result = incrementFileName(name, false, 'simple');
        assert.strictEqual(result, 'test copy 6');
    });
    test('Increment folder name without any version', function () {
        const name = 'test';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy');
    });
    test('Increment folder name with suffix version', function () {
        const name = 'test copy';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy 2');
    });
    test('Increment folder name with suffix version, leading zeros', function () {
        const name = 'test copy 005';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy 6');
    });
    test('Increment folder name with suffix version, too big number', function () {
        const name = 'test copy 9007199254740992';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy 9007199254740992 copy');
    });
    test('Increment folder name with just version in name', function () {
        const name = 'copy';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'copy copy');
    });
    test('Increment folder name with just version in name, v2', function () {
        const name = 'copy 2';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'copy 2 copy');
    });
    test('Increment folder name "with extension" but without any version', function () {
        const name = 'test.js';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test.js copy');
    });
    test('Increment folder name "with extension" and with suffix version', function () {
        const name = 'test.js copy 5';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test.js copy 6');
    });
    test('Increment file/folder name with suffix version, special case 1', function () {
        const name = 'test copy 0';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy');
    });
    test('Increment file/folder name with suffix version, special case 2', function () {
        const name = 'test copy 1';
        const result = incrementFileName(name, true, 'simple');
        assert.strictEqual(result, 'test copy 2');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
suite('Files - Increment file name smart', () => {
    test('Increment file name without any version', function () {
        const name = 'test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test.1.js');
    });
    test('Increment folder name without any version', function () {
        const name = 'test';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test.1');
    });
    test('Increment file name with suffix version', function () {
        const name = 'test.1.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test.2.js');
    });
    test('Increment file name with suffix version with trailing zeros', function () {
        const name = 'test.001.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test.002.js');
    });
    test('Increment file name with suffix version with trailing zeros, changing length', function () {
        const name = 'test.009.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test.010.js');
    });
    test('Increment file name with suffix version with `-` as separator', function () {
        const name = 'test-1.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test-2.js');
    });
    test('Increment file name with suffix version with `-` as separator, trailing zeros', function () {
        const name = 'test-001.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test-002.js');
    });
    test('Increment file name with suffix version with `-` as separator, trailing zeros, changnig length', function () {
        const name = 'test-099.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test-100.js');
    });
    test('Increment file name with suffix version with `_` as separator', function () {
        const name = 'test_1.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test_2.js');
    });
    test('Increment folder name with suffix version', function () {
        const name = 'test.1';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test.2');
    });
    test('Increment folder name with suffix version, trailing zeros', function () {
        const name = 'test.001';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test.002');
    });
    test('Increment folder name with suffix version with `-` as separator', function () {
        const name = 'test-1';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test-2');
    });
    test('Increment folder name with suffix version with `_` as separator', function () {
        const name = 'test_1';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test_2');
    });
    test('Increment file name with suffix version, too big number', function () {
        const name = 'test.9007199254740992.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'test.9007199254740992.1.js');
    });
    test('Increment folder name with suffix version, too big number', function () {
        const name = 'test.9007199254740992';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, 'test.9007199254740992.1');
    });
    test('Increment file name with prefix version', function () {
        const name = '1.test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '2.test.js');
    });
    test('Increment file name with just version in name', function () {
        const name = '1.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '2.js');
    });
    test('Increment file name with just version in name, too big number', function () {
        const name = '9007199254740992.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '9007199254740992.1.js');
    });
    test('Increment file name with prefix version, trailing zeros', function () {
        const name = '001.test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '002.test.js');
    });
    test('Increment file name with prefix version with `-` as separator', function () {
        const name = '1-test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '2-test.js');
    });
    test('Increment file name with prefix version with `_` as separator', function () {
        const name = '1_test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '2_test.js');
    });
    test('Increment file name with prefix version, too big number', function () {
        const name = '9007199254740992.test.js';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '9007199254740992.test.1.js');
    });
    test('Increment file name with just version and no extension', function () {
        const name = '001004';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '001005');
    });
    test('Increment file name with just version and no extension, too big number', function () {
        const name = '9007199254740992';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, '9007199254740992.1');
    });
    test('Increment file name with no extension and no version', function () {
        const name = 'file';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'file1');
    });
    test('Increment file name with no extension', function () {
        const name = 'file1';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'file2');
    });
    test('Increment file name with no extension, too big number', function () {
        const name = 'file9007199254740992';
        const result = incrementFileName(name, false, 'smart');
        assert.strictEqual(result, 'file9007199254740992.1');
    });
    test('Increment folder name with prefix version', function () {
        const name = '1.test';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, '2.test');
    });
    test('Increment folder name with prefix version, too big number', function () {
        const name = '9007199254740992.test';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, '9007199254740992.test.1');
    });
    test('Increment folder name with prefix version, trailing zeros', function () {
        const name = '001.test';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, '002.test');
    });
    test('Increment folder name with prefix version  with `-` as separator', function () {
        const name = '1-test';
        const result = incrementFileName(name, true, 'smart');
        assert.strictEqual(result, '2-test');
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZpbGVzL3Rlc3QvYnJvd3Nlci9maWxlQWN0aW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUVoRSxLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBQ2hELElBQUksQ0FBQyx5Q0FBeUMsRUFBRTtRQUMvQyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUE7UUFDdEIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5Q0FBeUMsRUFBRTtRQUMvQyxNQUFNLElBQUksR0FBRyxjQUFjLENBQUE7UUFDM0IsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO0lBQzdDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDREQUE0RCxFQUFFO1FBQ2xFLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixDQUFBO1FBQy9CLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5REFBeUQsRUFBRTtRQUMvRCxNQUFNLElBQUksR0FBRywrQkFBK0IsQ0FBQTtRQUM1QyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLG9DQUFvQyxDQUFDLENBQUE7SUFDakUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUU7UUFDckQsTUFBTSxJQUFJLEdBQUcsU0FBUyxDQUFBO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDM0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbURBQW1ELEVBQUU7UUFDekQsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzREFBc0QsRUFBRTtRQUM1RCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUE7UUFDbkIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvRUFBb0UsRUFBRTtRQUMxRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUE7UUFDcEIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtRUFBbUUsRUFBRTtRQUN6RSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUE7UUFDcEIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUN6QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzRUFBc0UsRUFBRTtRQUM1RSxNQUFNLElBQUksR0FBRyxRQUFRLENBQUE7UUFDckIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtRUFBbUUsRUFBRTtRQUN6RSxNQUFNLElBQUksR0FBRyxhQUFhLENBQUE7UUFDMUIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUMxQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRTtRQUNqRCxNQUFNLElBQUksR0FBRyxNQUFNLENBQUE7UUFDbkIsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN0RCxNQUFN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