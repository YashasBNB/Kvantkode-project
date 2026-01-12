/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { getRandomTestPath } from '../../../base/test/node/testUtils.js';
import { parseServerConnectionToken, ServerConnectionTokenParseError, } from '../../node/serverConnectionToken.js';
suite('parseServerConnectionToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function isError(r) {
        return r instanceof ServerConnectionTokenParseError;
    }
    function assertIsError(r) {
        assert.strictEqual(isError(r), true);
    }
    test('no arguments generates a token that is mandatory', async () => {
        const result = await parseServerConnectionToken({}, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
    });
    test('--without-connection-token', async () => {
        const result = await parseServerConnectionToken({ 'without-connection-token': true }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 0 /* ServerConnectionTokenType.None */);
    });
    test('--without-connection-token --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--without-connection-token --connection-token-file results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'without-connection-token': true, 'connection-token-file': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file --connection-token results in error', async () => {
        assertIsError(await parseServerConnectionToken({ 'connection-token-file': '0', 'connection-token': '0' }, async () => 'defaultTokenValue'));
    });
    test('--connection-token-file', async function () {
        this.timeout(10000);
        const testDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'server-connection-token');
        fs.mkdirSync(testDir, { recursive: true });
        const filename = path.join(testDir, 'connection-token-file');
        const connectionToken = `12345-123-abc`;
        fs.writeFileSync(filename, connectionToken);
        const result = await parseServerConnectionToken({ 'connection-token-file': filename }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
        fs.rmSync(testDir, { recursive: true, force: true });
    });
    test('--connection-token', async () => {
        const connectionToken = `12345-123-abc`;
        const result = await parseServerConnectionToken({ 'connection-token': connectionToken }, async () => 'defaultTokenValue');
        assert.ok(!(result instanceof ServerConnectionTokenParseError));
        assert.ok(result.type === 2 /* ServerConnectionTokenType.Mandatory */);
        assert.strictEqual(result.value, connectionToken);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3NlcnZlci90ZXN0L25vZGUvc2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTiwwQkFBMEIsRUFFMUIsK0JBQStCLEdBRS9CLE1BQU0scUNBQXFDLENBQUE7QUFHNUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLFNBQVMsT0FBTyxDQUNmLENBQTBEO1FBRTFELE9BQU8sQ0FBQyxZQUFZLCtCQUErQixDQUFBO0lBQ3BELENBQUM7SUFFRCxTQUFTLGFBQWEsQ0FBQyxDQUEwRDtRQUNoRixNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLE1BQU0sTUFBTSxHQUFHLE1BQU0sMEJBQTBCLENBQzlDLEVBQXNCLEVBQ3RCLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQy9CLENBQUE7UUFDRCxNQUFNLENBQUMsRUFBRSxDQUFDLENB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