/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { merge } from '../../common/extensionsMerge.js';
suite('ExtensionsMerge', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge returns local extension if remote does not exist', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, null, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('merge returns local extension if remote does not exist with ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [localExtensions[1], localExtensions[2]];
        const actual = merge(localExtensions, null, null, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with ignored extensions (ignore case)', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [localExtensions[1], localExtensions[2]];
        const actual = merge(localExtensions, null, null, [], ['A'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with skipped extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const skippedExtension = [aSyncExtension({ identifier: { id: 'b', uuid: 'b' } })];
        const expected = [...localExtensions];
        const actual = merge(localExtensions, null, null, skippedExtension, [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge returns local extension if remote does not exist with skipped and ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const skippedExtension = [aSyncExtension({ identifier: { id: 'b', uuid: 'b' } })];
        const expected = [localExtensions[1], localExtensions[2]];
        const actual = merge(localExtensions, null, null, skippedExtension, ['a'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when there is no base', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when there is no base and with ignored extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when remote is moved forwarded', () => {
        const baseExtensions = [
            aSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [
            { id: 'a', uuid: 'a' },
            { id: 'd', uuid: 'd' },
        ]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with disabled extension', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' }, disabled: true }),
        ]);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote moved forwarded with ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['a'], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } })];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when remote is moved forwarded with skipped and ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'd', uuid: 'd' } })];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['b'], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'd', uuid: 'd' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.strictEqual(actual.remote, null);
    });
    test('merge local and remote extensions when local is moved forwarded', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with disabled extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with ignored settings', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['b'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ]);
    });
    test('merge local and remote extensions when local is moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'd', uuid: 'd' } })];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when local is moved forwarded with skipped and ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'd', uuid: 'd' } })];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['c'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with ignored extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], ['a', 'e'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with skipped extensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge local and remote extensions when both moved forwarded with skipped and ignoredextensions', () => {
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const skippedExtensions = [aSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aRemoteSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'e', uuid: 'e' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, skippedExtensions, ['e'], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when remote extension has no uuid and different extension id case', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aLocalSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            aLocalSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'A' } }),
            aRemoteSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'A', uuid: 'a' } }),
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
            anExpectedSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedSyncExtension({ identifier: { id: 'c', uuid: 'c' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'd', uuid: 'd' } }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when remote extension is not an installed extension', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge when remote extension is not an installed extension but is an installed extension locally', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const expected = [anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when an extension is not an installed extension remotely and does not exist locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge when an extension is an installed extension remotely but not locally and updated locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const expected = [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge when an extension is an installed extension remotely but not locally and updated remotely', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, disabled: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge not installed extensions', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' }, installed: false }),
        ];
        const expected = [
            anExpectedBuiltinSyncExtension({ identifier: { id: 'b', uuid: 'b' } }),
            anExpectedBuiltinSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, expected);
    });
    test('merge: remote extension with prerelease is added', () => {
        const localExtensions = [];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension with prerelease is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ]);
    });
    test('merge: remote extension with prerelease is added when local extension without prerelease is added', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension without prerelease is added when local extension with prerelease is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to prerelease', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to release', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to prerelease', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ]);
    });
    test('merge: local extension is changed to release', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                preRelease: true,
                disabled: true,
            }),
        ]);
    });
    test('merge: local extension not an installed extension - remote preRelease property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, preRelease: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                preRelease: true,
                disabled: true,
            }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                preRelease: true,
                disabled: true,
            }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote version is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote version is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                disabled: true,
            }),
        ]);
    });
    test('merge: local extension not an installed extension - remote version property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                disabled: true,
            }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                disabled: true,
            }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has builtin extension, local does not have extension, remote has extension installed', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                installed: false,
            }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, local has installed extension, remote has extension builtin', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const baseExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, local has builtin extension, remote does not has extension', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedBuiltinSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
    });
    test('merge: base has builtin extension, local has installed extension, remote has builtin extension with updated state', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                installed: false,
                state: { a: 1 },
            }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { a: 1 } }),
        ]);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { a: 1 } }),
        ]);
    });
    test('merge: base has installed extension, last time synced as builtin extension, local has installed extension, remote has builtin extension with updated state', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const baseExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                installed: false,
                state: { a: 1 },
            }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { a: 1 } }),
        ]);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, state: { a: 1 } }),
        ]);
    });
    test('merge: base has builtin extension, local does not have extension, remote has builtin extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                installed: false,
            }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                installed: false,
            }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has installed extension, last synced as builtin, local does not have extension, remote has installed extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: base has builtin extension, last synced as builtin, local does not have extension, remote has installed extension', () => {
        const localExtensions = [];
        const baseExtensions = [
            aRemoteSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '1.1.0',
                installed: false,
            }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], [{ id: 'a', uuid: 'a' }]);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '1.1.0' }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension with pinned is added', () => {
        const localExtensions = [];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ]);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension with pinned is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ]);
    });
    test('merge: remote extension with pinned is added when local extension without pinned is added', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension without pinned is added when local extension with pinned is added', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to pinned', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to unpinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ]);
    });
    test('merge: local extension is changed to unpinned', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are no updates', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are updates locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false, disabled: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true }),
        ]);
    });
    test('merge: local extension not an installed extension - remote pinned property is taken precedence when there are updates remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, installed: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true, disabled: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '0.0.1',
                pinned: true,
            }),
        ]);
    });
    test('merge: local extension is changed to unpinned and version changed', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
    });
    test('merge: remote extension is changed to pinned and version changed', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '0.0.1',
                pinned: true,
            }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to pinned and version changed and remote extension is channged to pinned with different version', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.2', pinned: true }),
        ];
        const baseExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({
                identifier: { id: 'a', uuid: 'a' },
                version: '0.0.2',
                pinned: true,
            }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: remote extension is changed to unpinned and version changed', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1', pinned: true }),
        ];
        const remoteExtensions = [aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, remoteExtensions, localExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge: local extension is changed to unpinned and version changed and remote extension is channged to unpinned with different version', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.1' }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, version: '0.0.2' }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, pinned: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('sync adding local application scoped extension', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const actual = merge(localExtensions, null, null, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('sync merging local extension with isApplicationScoped property and remote does not has isApplicationScoped property', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const baseExtensions = [aSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const actual = merge(localExtensions, baseExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
        ]);
    });
    test('sync merging when applicaiton scope is changed locally', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const actual = merge(localExtensions, baseExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote?.all, localExtensions);
    });
    test('sync merging when applicaiton scope is changed remotely', () => {
        const localExtensions = [
            aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const baseExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: false }),
        ];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ];
        const actual = merge(localExtensions, remoteExtensions, baseExtensions, [], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, [
            anExpectedSyncExtension({ identifier: { id: 'a', uuid: 'a' }, isApplicationScoped: true }),
        ]);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge does not remove remote extension when skipped extension has uuid but remote does not has', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [aRemoteSyncExtension({ identifier: { id: 'b', uuid: 'b' } })], [], []);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    test('merge does not remove remote extension when last sync builtin extension has uuid but remote does not has', () => {
        const localExtensions = [aLocalSyncExtension({ identifier: { id: 'a', uuid: 'a' } })];
        const remoteExtensions = [
            aRemoteSyncExtension({ identifier: { id: 'a', uuid: 'a' } }),
            aRemoteSyncExtension({ identifier: { id: 'b' } }),
        ];
        const actual = merge(localExtensions, remoteExtensions, remoteExtensions, [], [], [{ id: 'b', uuid: 'b' }]);
        assert.deepStrictEqual(actual.local.added, []);
        assert.deepStrictEqual(actual.local.removed, []);
        assert.deepStrictEqual(actual.local.updated, []);
        assert.deepStrictEqual(actual.remote, null);
    });
    function anExpectedSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension,
        };
    }
    function anExpectedBuiltinSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            ...extension,
        };
    }
    function aLocalSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension,
        };
    }
    function aRemoteSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            pinned: false,
            preRelease: false,
            installed: true,
            ...extension,
        };
    }
    function aSyncExtension(extension) {
        return {
            identifier: { id: 'a', uuid: 'a' },
            version: '1.0.0',
            installed: true,
            ...extension,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3VzZXJEYXRhU3luYy90ZXN0L2NvbW1vbi9leHRlbnNpb25zTWVyZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3ZELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsd0RBQXdELEVBQUUsR0FBRyxFQUFFO1FBQ25FLE1BQU0sZUFBZSxHQUFHO1lBQ3ZCLG1CQUFtQixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzRCxtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDM0QsbUJBQW1CLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1NBQzNELENBQUE7UUFFRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxD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