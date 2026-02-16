/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { addSetting, merge, updateIgnoredSettings } from '../../common/settingsMerge.js';
const formattingOptions = { eol: '\n', insertSpaces: false, tabSize: 4 };
suite('SettingsMerge - Merge', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('merge when local and remote are same with one entry', async () => {
        const localContent = stringify({ a: 1 });
        const remoteContent = stringify({ a: 1 });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote are same with multiple entries', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote are same with multiple entries in different order', async () => {
        const localContent = stringify({
            b: 2,
            a: 1,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.strictEqual(actual.conflictsSettings.length, 0);
    });
    test('merge when local and remote are same with different base content', async () => {
        const localContent = stringify({
            b: 2,
            a: 1,
        });
        const baseContent = stringify({
            a: 2,
            b: 1,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
        });
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(actual.hasConflicts);
    });
    test('merge when a new entry is added to remote', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to remote', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
            c: 3,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to remote from base and local has not changed', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            b: 2,
            a: 1,
            c: 3,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is removed from remote from base and local has not changed', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
        });
        const remoteContent = stringify({
            a: 1,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when all entries are removed from base and local has not changed', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is updated in remote from base and local has not changed', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            a: 2,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with multiple changes and local stays with base', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            a: 2,
            b: 1,
            c: 3,
            d: 4,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with order changes and local stays with base', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
            c: 3,
        });
        const remoteContent = stringify({
            a: 2,
            d: 4,
            c: 3,
            b: 2,
        });
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with comment changes and local stays with base', async () => {
        const localContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// comment b has changed
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when remote has moved forwareded with comment and order changes and local stays with base', async () => {
        const localContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// this is comment for c
	"c": 1,
	// comment b has changed
	"b": 2,
}`;
        const actual = merge(localContent, remoteContent, localContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when a new entries are added to local', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        });
        const remoteContent = stringify({
            a: 1,
        });
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when multiple new entries are added to local from base and remote is not changed', async () => {
        const localContent = stringify({
            a: 2,
            b: 1,
            c: 3,
            d: 4,
        });
        const remoteContent = stringify({
            a: 1,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is removed from local from base and remote has not changed', async () => {
        const localContent = stringify({
            a: 1,
            c: 2,
        });
        const remoteContent = stringify({
            a: 2,
            b: 1,
            c: 3,
            d: 4,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when an entry is updated in local from base and remote has not changed', async () => {
        const localContent = stringify({
            a: 1,
            c: 2,
        });
        const remoteContent = stringify({
            a: 2,
            c: 2,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with multiple changes and remote stays with base', async () => {
        const localContent = stringify({
            a: 2,
            b: 1,
            c: 3,
            d: 4,
        });
        const remoteContent = stringify({
            a: 1,
        });
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with order changes and remote stays with base', async () => {
        const localContent = `
{
	"b": 2,
	"c": 1,
}`;
        const remoteContent = stringify `
{
	"c": 1,
	"b": 2,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with comment changes and remote stays with base', async () => {
        const localContent = `
{
	// comment for b has changed
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const remoteContent = stringify `
{
	// comment for b
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local has moved forwarded with comment and order changes and remote stays with base', async () => {
        const localContent = `
{
	// comment for c
	"c": 1,
	// comment for b has changed
	"b": 2,
}`;
        const remoteContent = stringify `
{
	// comment for b
	"b": 2,
	// comment for c
	"c": 1,
}`;
        const actual = merge(localContent, remoteContent, remoteContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, localContent);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('merge when local and remote with one entry but different value', async () => {
        const localContent = stringify({
            a: 1,
        });
        const remoteContent = stringify({
            a: 2,
        });
        const expectedConflicts = [{ key: 'a', localValue: 1, remoteValue: 2 }];
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when the entry is removed in remote but updated in local and a new entry is added in remote', async () => {
        const baseContent = stringify({
            a: 1,
        });
        const localContent = stringify({
            a: 2,
        });
        const remoteContent = stringify({
            b: 2,
        });
        const expectedConflicts = [
            { key: 'a', localValue: 2, remoteValue: undefined },
        ];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 2,
            b: 2,
        }));
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge with single entry and local is empty', async () => {
        const baseContent = stringify({
            a: 1,
        });
        const localContent = stringify({});
        const remoteContent = stringify({
            a: 2,
        });
        const expectedConflicts = [
            { key: 'a', localValue: undefined, remoteValue: 2 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when local and remote has moved forwareded with conflicts', async () => {
        const baseContent = stringify({
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        });
        const localContent = stringify({
            a: 2,
            c: 3,
            d: 5,
            e: 4,
            f: 1,
        });
        const remoteContent = stringify({
            b: 3,
            c: 3,
            d: 6,
            e: 5,
        });
        const expectedConflicts = [
            { key: 'b', localValue: undefined, remoteValue: 3 },
            { key: 'a', localValue: 2, remoteValue: undefined },
            { key: 'd', localValue: 5, remoteValue: 6 },
            { key: 'e', localValue: 4, remoteValue: 5 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 2,
            c: 3,
            d: 5,
            e: 4,
            f: 1,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            b: 3,
            c: 3,
            d: 6,
            e: 5,
            f: 1,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('merge when local and remote has moved forwareded with change in order', async () => {
        const baseContent = stringify({
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        });
        const localContent = stringify({
            a: 2,
            c: 3,
            b: 2,
            d: 4,
            e: 5,
        });
        const remoteContent = stringify({
            a: 1,
            b: 2,
            c: 4,
        });
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 2,
            c: 4,
            b: 2,
            e: 5,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            a: 2,
            b: 2,
            e: 5,
            c: 4,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, []);
    });
    test('merge when local and remote has moved forwareded with comment changes', async () => {
        const baseContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const localContent = `
{
	// comment b has changed in local
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const remoteContent = `
{
	// comment b has changed in remote
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const actual = merge(localContent, remoteContent, baseContent, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, localContent);
        assert.strictEqual(actual.remoteContent, remoteContent);
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, []);
    });
    test('resolve when local and remote has moved forwareded with resolved conflicts', async () => {
        const baseContent = stringify({
            a: 1,
            b: 2,
            c: 3,
            d: 4,
        });
        const localContent = stringify({
            a: 2,
            c: 3,
            d: 5,
            e: 4,
            f: 1,
        });
        const remoteContent = stringify({
            b: 3,
            c: 3,
            d: 6,
            e: 5,
        });
        const expectedConflicts = [{ key: 'd', localValue: 5, remoteValue: 6 }];
        const actual = merge(localContent, remoteContent, baseContent, [], [
            { key: 'a', value: 2 },
            { key: 'b', value: undefined },
            { key: 'e', value: 5 },
        ], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 2,
            c: 3,
            d: 5,
            e: 5,
            f: 1,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            c: 3,
            d: 6,
            e: 5,
            f: 1,
            a: 2,
        }));
        assert.ok(actual.hasConflicts);
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
    });
    test('ignored setting is not merged when changed in local and remote', async () => {
        const localContent = stringify({ a: 1 });
        const remoteContent = stringify({ a: 2 });
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when changed in local and remote from base', async () => {
        const baseContent = stringify({ a: 0 });
        const localContent = stringify({ a: 1 });
        const remoteContent = stringify({ a: 2 });
        const actual = merge(localContent, remoteContent, baseContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when added in remote', async () => {
        const localContent = stringify({});
        const remoteContent = stringify({ a: 1 });
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when added in remote from base', async () => {
        const localContent = stringify({ b: 2 });
        const remoteContent = stringify({ a: 1, b: 2 });
        const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when removed in remote', async () => {
        const localContent = stringify({ a: 1 });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, null, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged when removed in remote from base', async () => {
        const localContent = stringify({ a: 2 });
        const remoteContent = stringify({});
        const actual = merge(localContent, remoteContent, localContent, ['a'], [], formattingOptions);
        assert.strictEqual(actual.localContent, null);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged with other changes without conflicts', async () => {
        const baseContent = stringify({
            a: 2,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
        });
        const localContent = stringify({
            a: 1,
            b: 2,
            c: 3,
        });
        const remoteContent = stringify({
            a: 3,
            b: 3,
            d: 4,
            e: 6,
        });
        const actual = merge(localContent, remoteContent, baseContent, ['a', 'e'], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 1,
            b: 3,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            a: 3,
            b: 3,
            e: 6,
        }));
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
    test('ignored setting is not merged with other changes conflicts', async () => {
        const baseContent = stringify({
            a: 2,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
        });
        const localContent = stringify({
            a: 1,
            b: 4,
            c: 3,
            d: 5,
        });
        const remoteContent = stringify({
            a: 3,
            b: 3,
            e: 6,
        });
        const expectedConflicts = [
            { key: 'd', localValue: 5, remoteValue: undefined },
            { key: 'b', localValue: 4, remoteValue: 3 },
        ];
        const actual = merge(localContent, remoteContent, baseContent, ['a', 'e'], [], formattingOptions);
        assert.strictEqual(actual.localContent, stringify({
            a: 1,
            b: 4,
            d: 5,
        }));
        assert.strictEqual(actual.remoteContent, stringify({
            a: 3,
            b: 3,
            e: 6,
        }));
        assert.deepStrictEqual(actual.conflictsSettings, expectedConflicts);
        assert.ok(actual.hasConflicts);
    });
    test('merge when remote has comments and local is empty', async () => {
        const localContent = `
{

}`;
        const remoteContent = stringify `
{
	// this is a comment
	"a": 1,
}`;
        const actual = merge(localContent, remoteContent, null, [], [], formattingOptions);
        assert.strictEqual(actual.localContent, remoteContent);
        assert.strictEqual(actual.remoteContent, null);
        assert.strictEqual(actual.conflictsSettings.length, 0);
        assert.ok(!actual.hasConflicts);
    });
});
suite('SettingsMerge - Compute Remote Content', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('local content is returned when there are no ignored settings', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
            c: 3,
        });
        const remoteContent = stringify({
            a: 3,
            b: 3,
            d: 4,
            e: 6,
        });
        const actual = updateIgnoredSettings(localContent, remoteContent, [], formattingOptions);
        assert.strictEqual(actual, localContent);
    });
    test('when target content is empty', async () => {
        const remoteContent = stringify({
            a: 3,
        });
        const actual = updateIgnoredSettings('', remoteContent, ['a'], formattingOptions);
        assert.strictEqual(actual, '');
    });
    test('when source content is empty', async () => {
        const localContent = stringify({
            a: 3,
            b: 3,
        });
        const expected = stringify({
            b: 3,
        });
        const actual = updateIgnoredSettings(localContent, '', ['a'], formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('ignored settings are not updated from remote content', async () => {
        const localContent = stringify({
            a: 1,
            b: 2,
            c: 3,
        });
        const remoteContent = stringify({
            a: 3,
            b: 3,
            d: 4,
            e: 6,
        });
        const expected = stringify({
            a: 3,
            b: 2,
            c: 3,
        });
        const actual = updateIgnoredSettings(localContent, remoteContent, ['a'], formattingOptions);
        assert.strictEqual(actual, expected);
    });
});
suite('SettingsMerge - Add Setting', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Insert after a setting without comments', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 2,
	"d": 3
}`;
        const expected = `
{
	"a": 2,
	"b": 2,
	"d": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting without comments at the end', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 2
}`;
        const expected = `
{
	"a": 2,
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert between settings without comment', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert between settings and there is a comment in between in source', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting and after a comment at the end', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for b
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting ending with comma and after a comment at the end', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment and there are no settings', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2
}`;
        const targetContent = `
{
	// this is comment for b
}`;
        const expected = `
{
	// this is comment for b
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting and between a comment and setting', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments on the same line and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	/* this is comment for b */ // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2, // this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two line comments on the same line and there is a setting after', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b // this is comment for c
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting between two comments and there is no setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for b
	// this is a comment
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting with comma and between two comments and there is no setting after', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1,
	// this is comment for b
	// this is a comment
}`;
        const expected = `
{
	"a": 1,
	// this is comment for b
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting without comments', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"d": 2,
	"c": 3
}`;
        const expected = `
{
	"d": 2,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting without comments at the end', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"c": 3
}`;
        const expected = `
{
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting with comment', () => {
        const sourceContent = `
{
	"a": 1,
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting and before a comment at the beginning', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const targetContent = `
{
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting ending with comma and before a comment at the begninning', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const targetContent = `
{
	// this is comment for b
	"c": 3,
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	"c": 3,
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting and between a setting and comment', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	// this is comment for b
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b
	// this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments on the same line and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	/* this is comment for b */ // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two line comments on the same line and there is a setting before', () => {
        const sourceContent = `
{
	"a": 1,
	/* this is comment for b */
	"b": 2,
	// this is comment for c
	"c": 3
}`;
        const targetContent = `
{
	"d": 1,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const expected = `
{
	"d": 1,
	"b": 2,
	// this is comment for b // this is comment for c
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting between two comments and there is no setting before', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const targetContent = `
{
	// this is comment for b
	// this is comment for c
	"c": 1
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert before a setting with comma and between two comments and there is no setting before', () => {
        const sourceContent = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1
}`;
        const targetContent = `
{
	// this is comment for b
	// this is comment for c
	"c": 1,
}`;
        const expected = `
{
	// this is comment for b
	"b": 2,
	// this is comment for c
	"c": 1,
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a setting that is of object type', () => {
        const sourceContent = `
{
	"b": {
		"d": 1
	},
	"a": 2,
	"c": 1
}`;
        const targetContent = `
{
	"b": {
		"d": 1
	},
	"c": 1
}`;
        const actual = addSetting('a', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, sourceContent);
    });
    test('Insert after a setting that is of array type', () => {
        const sourceContent = `
{
	"b": [
		1
	],
	"a": 2,
	"c": 1
}`;
        const targetContent = `
{
	"b": [
		1
	],
	"c": 1
}`;
        const actual = addSetting('a', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, sourceContent);
    });
    test('Insert after a comment with comma separator of previous setting and no next nodes ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment with comma separator of previous setting and there is a setting after ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2,
	"c": 3
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	"c": 3
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2,
	"c": 3
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
    test('Insert after a comment with comma separator of previous setting and there is a comment after ', () => {
        const sourceContent = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
	// this is a comment
}`;
        const targetContent = `
{
	"a": 1
	// this is comment for a
	,
	// this is a comment
}`;
        const expected = `
{
	"a": 1
	// this is comment for a
	,
	"b": 2
	// this is a comment
}`;
        const actual = addSetting('b', sourceContent, targetContent, formattingOptions);
        assert.strictEqual(actual, expected);
    });
});
function stringify(value) {
    return JSON.stringify(value, null, '\t');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vc2V0dGluZ3NNZXJnZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBR3hGLE1BQU0saUJBQWlCLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFBO0FBRXhFLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEUsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDeEMsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDekMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNsRixNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENB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