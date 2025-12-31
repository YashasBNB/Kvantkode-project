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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NNZXJnZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3NldHRpbmdzTWVyZ2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUd4RixNQUFNLGlCQUFpQixHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQTtBQUV4RSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLHFEQUFxRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RFLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sYUFBYSxHQUFHLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDbEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMs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