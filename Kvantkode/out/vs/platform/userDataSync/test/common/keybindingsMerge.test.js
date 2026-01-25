/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { merge } from '../../common/keybindingsMerge.js';
import { TestUserDataSyncUtilService } from './userDataSyncClient.js';
suite('KeybindingsMerge - No Conflicts', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge when local and remote are same with one entry', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with similar when contexts', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: '!editorReadonly && editorTextFocus' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote has entries in different order', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: 'a', when: 'editorTextFocus' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'a', when: 'editorTextFocus' },
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with multiple entries', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with different base content', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const baseContent = stringify([
            { key: 'ctrl+c', command: 'e' },
            { key: 'shift+d', command: 'd', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same with multiple entries in different order', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local and remote are same when remove entry is in different order', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+d', command: '-a' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(!actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when a new entry is added to remote', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when multiple new entries are added to remote', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when multiple new entries are added to remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry is removed from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry (same command) is removed from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when an entry is updated in remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when a command with multiple entries is updated from remote from base and local has not changed', async () => {
        const localContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+c', command: 'a' },
        ]);
        const remoteContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+d', command: 'a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when remote has moved forwareded with multiple changes and local stays with base', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, localContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, remoteContent);
    });
    test('merge when a new entry is added to local', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when multiple new entries are added to local', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when multiple new entries are added to local from base and remote is not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'cmd+d', command: 'c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry is removed from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry (with same command) is removed from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: '-a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when an entry is updated in local from base and remote has not changed', async () => {
        const localContent = stringify([{ key: 'alt+d', command: 'a', when: 'editorTextFocus' }]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when a command with multiple entries is updated from local from base and remote has not changed', async () => {
        const localContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+c', command: 'a' },
        ]);
        const remoteContent = stringify([
            { key: 'shift+c', command: 'c' },
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+d', command: 'b' },
            { key: 'cmd+d', command: 'a' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, localContent);
    });
    test('merge when local has moved forwareded with multiple changes and remote stays with base', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+c', command: 'b', args: { text: '`' } },
            { key: 'alt+d', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
        ]);
        const expected = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+d', command: '-a' },
            { key: 'alt+f', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, remoteContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, expected);
    });
    test('merge when local and remote has moved forwareded with conflicts', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'ctrl+c', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const localContent = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'f' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'd' },
            { key: 'alt+d', command: '-f' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const expected = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(!actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, expected);
    });
    test('merge when local and remote with one entry but different value', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when local and remote with different keybinding', async () => {
        const localContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: '-a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+a', command: '-a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, null);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	},
	{
		"key": "alt+a",
		"command": "-a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when the entry is removed in local but updated in remote', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const localContent = stringify([]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[]`);
    });
    test('merge when the entry is removed in local but updated in remote and a new entry is added in local', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const localContent = stringify([{ key: 'alt+b', command: 'b' }]);
        const remoteContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+b",
		"command": "b"
	}
]`);
    });
    test('merge when the entry is removed in remote but updated in local', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+c",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	}
]`);
    });
    test('merge when the entry is removed in remote but updated in local and a new entry is added in remote', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const localContent = stringify([
            { key: 'alt+c', command: 'a', when: 'editorTextFocus && !editorReadonly' },
        ]);
        const remoteContent = stringify([{ key: 'alt+b', command: 'b' }]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+c",
		"command": "a",
		"when": "editorTextFocus && !editorReadonly"
	},
	{
		"key": "alt+b",
		"command": "b"
	}
]`);
    });
    test('merge when local and remote has moved forwareded with conflicts (2)', async () => {
        const baseContent = stringify([
            { key: 'alt+d', command: 'a', when: 'editorTextFocus && !editorReadonly' },
            { key: 'alt+c', command: '-a' },
            { key: 'cmd+e', command: 'd' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'cmd+c', command: '-c' },
        ]);
        const localContent = stringify([
            { key: 'alt+d', command: '-f' },
            { key: 'cmd+e', command: 'd' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'c', when: 'context1' },
            { key: 'alt+a', command: 'f' },
            { key: 'alt+e', command: 'e' },
        ]);
        const remoteContent = stringify([
            { key: 'alt+a', command: 'f' },
            { key: 'cmd+c', command: '-c' },
            { key: 'cmd+d', command: 'd' },
            { key: 'alt+d', command: '-f' },
            { key: 'alt+c', command: 'c', when: 'context1' },
            { key: 'alt+g', command: 'g', when: 'context2' },
        ]);
        const actual = await mergeKeybindings(localContent, remoteContent, baseContent);
        assert.ok(actual.hasChanges);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.mergeContent, `[
	{
		"key": "alt+d",
		"command": "-f"
	},
	{
		"key": "cmd+d",
		"command": "d"
	},
	{
		"key": "cmd+c",
		"command": "-c"
	},
	{
		"key": "cmd+d",
		"command": "c",
		"when": "context1"
	},
	{
		"key": "alt+a",
		"command": "f"
	},
	{
		"key": "alt+e",
		"command": "e"
	},
	{
		"key": "alt+g",
		"command": "g",
		"when": "context2"
	}
]`);
    });
});
async function mergeKeybindings(localContent, remoteContent, baseContent) {
    const userDataSyncUtilService = new TestUserDataSyncUtilService();
    const formattingOptions = await userDataSyncUtilService.resolveFormattingOptions();
    return merge(localContent, remoteContent, baseContent, formattingOptions, userDataSyncUtilService);
}
function stringify(value) {
    return JSON.stringify(value, null, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24va2V5YmluZGluZ3NNZXJnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFckUsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtJQUM3Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUM7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG9DQUFvQyxFQUFFO1NBQzFFLENBQUMsQ0FBQTtRQUNGLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQztZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsb0NBQW9DLEVBQUU7U0FDMUUsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FB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O1lBQzFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDaEQsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7U0FDL0IsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDaEQsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDOUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7U0FDOUIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDaEQsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtTQUNoRCxDQUFDLENBQUE7UUFDRixNQUFNLE1BQU0sR0FBRyxNQUFNLGdCQUFnQixDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDL0UsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUIsTUFBTSxDQUFDLFdBQVcsQ0FDakIsTUFBTSxDQUFDLFlBQVksRUFDbkI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUErQkQsQ0FDQyxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssVUFBVSxnQkFBZ0IsQ0FDOUIsWUFBb0IsRUFDcEIsYUFBcUIsRUFDckIsV0FBMEI7SUFFMUIsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUE7SUFDakUsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLHVCQUF1QixDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDbEYsT0FBTyxLQUFLLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtBQUNuRyxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsS0FBVTtJQUM1QixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN6QyxDQUFDIn0=