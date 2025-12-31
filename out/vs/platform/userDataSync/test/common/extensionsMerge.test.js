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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01lcmdlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vZXh0ZW5zaW9uc01lcmdlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUd2RCxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEdBQUcsRUFBRTtRQUNuRSxNQUFNLGVBQWUsR0FBRztZQUN2QixtQkFBbUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDM0QsbUJBQW1CLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQzNELG1CQUFtQixDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztTQUMzRCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFN0QsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtR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