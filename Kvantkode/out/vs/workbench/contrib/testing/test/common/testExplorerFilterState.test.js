/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestExplorerFilterState } from '../../common/testExplorerFilterState.js';
suite('TestExplorerFilterState', () => {
    let t;
    let ds;
    teardown(() => {
        ds.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        ds = new DisposableStore();
        t = ds.add(new TestExplorerFilterState(ds.add(new InMemoryStorageService())));
    });
    const assertFilteringFor = (expected) => {
        for (const [term, expectation] of Object.entries(expected)) {
            assert.strictEqual(t.isFilteringFor(term), expectation, `expected filtering for ${term} === ${expectation}`);
        }
    };
    const termFiltersOff = {
        ["@failed" /* TestFilterTerm.Failed */]: false,
        ["@executed" /* TestFilterTerm.Executed */]: false,
        ["@doc" /* TestFilterTerm.CurrentDoc */]: false,
        ["@hidden" /* TestFilterTerm.Hidden */]: false,
    };
    test('filters simple globs', () => {
        t.setText('hello, !world');
        assert.deepStrictEqual(t.globList, [
            { text: 'hello', include: true },
            { text: 'world', include: false },
        ]);
        assert.deepStrictEqual(t.includeTags, new Set());
        assert.deepStrictEqual(t.excludeTags, new Set());
        assertFilteringFor(termFiltersOff);
    });
    test('filters to patterns', () => {
        t.setText('@doc');
        assert.deepStrictEqual(t.globList, []);
        assert.deepStrictEqual(t.includeTags, new Set());
        assert.deepStrictEqual(t.excludeTags, new Set());
        assertFilteringFor({
            ...termFiltersOff,
            ["@doc" /* TestFilterTerm.CurrentDoc */]: true,
        });
    });
    test('filters to tags', () => {
        t.setText('@hello:world !@foo:bar');
        assert.deepStrictEqual(t.globList, []);
        assert.deepStrictEqual(t.includeTags, new Set(['hello\0world']));
        assert.deepStrictEqual(t.excludeTags, new Set(['foo\0bar']));
        assertFilteringFor(termFiltersOff);
    });
    test('filters to mixed terms and tags', () => {
        t.setText('@hello:world foo, !bar @doc !@foo:bar');
        assert.deepStrictEqual(t.globList, [
            { text: 'foo', include: true },
            { text: 'bar', include: false },
        ]);
        assert.deepStrictEqual(t.includeTags, new Set(['hello\0world']));
        assert.deepStrictEqual(t.excludeTags, new Set(['foo\0bar']));
        assertFilteringFor({
            ...termFiltersOff,
            ["@doc" /* TestFilterTerm.CurrentDoc */]: true,
        });
    });
    test('parses quotes', () => {
        t.setText('@hello:"world" @foo:\'bar\' baz');
        assert.deepStrictEqual(t.globList, [{ text: 'baz', include: true }]);
        assert.deepStrictEqual([...t.includeTags], ['hello\0world', 'foo\0bar']);
        assert.deepStrictEqual(t.excludeTags, new Set());
    });
    test('parses quotes with escapes', () => {
        t.setText('@hello:"world\\"1" foo');
        assert.deepStrictEqual(t.globList, [{ text: 'foo', include: true }]);
        assert.deepStrictEqual([...t.includeTags], ['hello\0world"1']);
        assert.deepStrictEqual(t.excludeTags, new Set());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy90ZXN0L2NvbW1vbi90ZXN0RXhwbG9yZXJGaWx0ZXJTdGF0ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFrQixNQUFNLHlDQUF5QyxDQUFBO0FBRWpHLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsSUFBSSxDQUEwQixDQUFBO0lBQzlCLElBQUksRUFBbUIsQ0FBQTtJQUV2QixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2IsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixFQUFFLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUMxQixDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzlFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFFBQTZDLEVBQUUsRUFBRTtRQUM1RSxLQUFLLE1B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