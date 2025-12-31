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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvdGVzdC9ub2RlL3NlcnZlckNvbm5lY3Rpb25Ub2tlbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQTtBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sMEJBQTBCLEVBRTFCLCtCQUErQixHQUUvQixNQUFNLHFDQUFxQyxDQUFBO0FBRzVDLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxTQUFTLE9BQU8sQ0FDZixDQUEwRDtRQUUxRCxPQUFPLENBQUMsWUFBWSwrQkFBK0IsQ0FBQTtJQUNwRCxDQUFDO0lBRUQsU0FBUyxhQUFhLENBQUMsQ0FBMEQ7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRSxNQUFNLE1BQU0sR0FBRyxNQUFNLDBCQUEwQixDQUM5QyxFQUFzQixFQUN0QixLQUFLLElBQUksRUFBRSxDQUFDLG1CQUFtQixDQUMvQixDQUFBO1FBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENB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