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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL2tleWJpbmRpbmdzTWVyZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJFLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEUsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxvQ0FBb0MsRUFBRTtTQUMxRSxDQUFDLENBQUE7UUFDRixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUM7WUFDL0IsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLG9DQUFvQyxFQUFFO1NBQzFFLENBQUMsQ0FBQTtRQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsWUFBWSxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN4RSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFB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RSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2hELEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1NBQy9CLENBQUMsQ0FBQTtRQUNGLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQztZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2hELEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1lBQzlCLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFO1NBQzlCLENBQUMsQ0FBQTtRQUNGLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQztZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtZQUM5QixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRTtZQUMvQixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2hELEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7U0FDaEQsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxZQUFZLEVBQ25COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBK0JELENBQ0MsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixLQUFLLFVBQVUsZ0JBQWdCLENBQzlCLFlBQW9CLEVBQ3BCLGFBQXFCLEVBQ3JCLFdBQTBCO0lBRTFCLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSwyQkFBMkIsRUFBRSxDQUFBO0lBQ2pFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ2xGLE9BQU8sS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixDQUFDLENBQUE7QUFDbkcsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLEtBQVU7SUFDNUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDekMsQ0FBQyJ9