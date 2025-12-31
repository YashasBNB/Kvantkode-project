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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdEV4cGxvcmVyRmlsdGVyU3RhdGUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBa0IsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLElBQUksQ0FBMEIsQ0FBQTtJQUM5QixJQUFJLEVBQW1CLENBQUE7SUFFdkIsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNiLENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsRUFBRSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDMUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5RSxDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxRQUE2QyxFQUFFLEVBQUU7UUFDNUUsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcs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