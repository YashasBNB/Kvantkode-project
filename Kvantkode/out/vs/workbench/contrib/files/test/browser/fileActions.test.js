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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZUFjdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvdGVzdC9icm93c2VyL2ZpbGVBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWhFLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDaEQsSUFBSSxDQUFDLHlDQUF5QyxFQUFFO1FBQy9DLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQTtRQUN0QixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlDQUF5QyxFQUFFO1FBQy9DLE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQTtRQUMzQixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLGdCQUFnQixDQUFDLENBQUE7SUFDN0MsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNERBQTRELEVBQUU7UUFDbEUsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUE7UUFDL0IsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMs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QUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsOEVBQThFLEVBQUU7UUFDcEYsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFBO1FBQzFCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0RBQStELEVBQUU7UUFDckUsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0VBQStFLEVBQUU7UUFDckYsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFBO1FBQzFCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0dBQWdHLEVBQUU7UUFDdEcsTUFBTSxJQUFJLEdBQUcsYUFBYSxDQUFBO1FBQzFCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDMUMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0RBQStELEVBQUU7UUFDckUsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFBO1FBQ3hCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDeEMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkNBQTJDLEVBQUU7UUFDakQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFBO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMkRBQTJELEVBQUU7UUFDakUsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFBO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUU7UUFDdkUsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFBO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUU7UUFDdkUsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFBO1FBQ3JCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDckMsQ0FB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