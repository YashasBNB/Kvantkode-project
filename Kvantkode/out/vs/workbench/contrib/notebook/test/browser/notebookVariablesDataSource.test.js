/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource } from '../../../../../base/common/async.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotebookVariableDataSource, } from '../../browser/contrib/notebookVariables/notebookVariablesDataSource.js';
suite('NotebookVariableDataSource', () => {
    let dataSource;
    const notebookModel = { uri: 'one.ipynb', languages: ['python'] };
    let provideVariablesCalled;
    let results;
    const kernel = new (class extends mock() {
        constructor() {
            super(...arguments);
            this.hasVariableProvider = true;
        }
        provideVariables(notebookUri, parentId, kind, start, token) {
            provideVariablesCalled = true;
            const source = new AsyncIterableSource();
            for (let i = 0; i < results.length; i++) {
                if (token.isCancellationRequested) {
                    break;
                }
                if (results[i].action) {
                    results[i].action();
                }
                source.emitOne(results[i]);
            }
            setTimeout(() => source.resolve(), 0);
            return source.asyncIterable;
        }
    })();
    const kernelService = new (class extends mock() {
        getMatchingKernel(notebook) {
            return { selected: kernel, all: [], suggestions: [], hidden: [] };
        }
    })();
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        provideVariablesCalled = false;
        dataSource = new NotebookVariableDataSource(kernelService);
        results = [{ id: 1, name: 'a', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 }];
    });
    test('Root element should return children', async () => {
        const variables = await dataSource.getChildren({ kind: 'root', notebook: notebookModel });
        assert.strictEqual(variables.length, 1);
    });
    test('Get children of list element', async () => {
        const parent = {
            kind: 'variable',
            notebook: notebookModel,
            id: '1',
            extHostId: 1,
            name: 'list',
            value: '[...]',
            hasNamedChildren: false,
            indexedChildrenCount: 5,
        };
        results = [
            { id: 2, name: 'first', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 3, name: 'second', value: '2', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 4, name: 'third', value: '3', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 5, name: 'fourth', value: '4', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 6, name: 'fifth', value: '5', hasNamedChildren: false, indexedChildrenCount: 0 },
        ];
        const variables = await dataSource.getChildren(parent);
        assert.strictEqual(variables.length, 5);
    });
    test('Get children for large list', async () => {
        const parent = {
            kind: 'variable',
            notebook: notebookModel,
            id: '1',
            extHostId: 1,
            name: 'list',
            value: '[...]',
            hasNamedChildren: false,
            indexedChildrenCount: 2000,
        };
        results = [];
        const variables = await dataSource.getChildren(parent);
        assert(variables.length > 1, 'We should have results for groups of children');
        assert(!provideVariablesCalled, 'provideVariables should not be called');
        assert.equal(variables[0].extHostId, parent.extHostId, 'ExtHostId should match the parent since we will use it to get the real children');
    });
    test('Get children for very large list', async () => {
        const parent = {
            kind: 'variable',
            notebook: notebookModel,
            id: '1',
            extHostId: 1,
            name: 'list',
            value: '[...]',
            hasNamedChildren: false,
            indexedChildrenCount: 1_000_000,
        };
        results = [];
        const groups = await dataSource.getChildren(parent);
        const children = await dataSource.getChildren(groups[99]);
        assert(children.length === 100, 'We should have a full page of child groups');
        assert(!provideVariablesCalled, 'provideVariables should not be called');
        assert.equal(children[0].extHostId, parent.extHostId, 'ExtHostId should match the parent since we will use it to get the real children');
    });
    test('Cancel while enumerating through children', async () => {
        const parent = {
            kind: 'variable',
            notebook: notebookModel,
            id: '1',
            extHostId: 1,
            name: 'list',
            value: '[...]',
            hasNamedChildren: false,
            indexedChildrenCount: 10,
        };
        results = [
            { id: 2, name: 'first', value: '1', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 3, name: 'second', value: '2', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 4, name: 'third', value: '3', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 5, name: 'fourth', value: '4', hasNamedChildren: false, indexedChildrenCount: 0 },
            {
                id: 5,
                name: 'fifth',
                value: '4',
                hasNamedChildren: false,
                indexedChildrenCount: 0,
                action: () => dataSource.cancel(),
            },
            { id: 7, name: 'sixth', value: '6', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 8, name: 'seventh', value: '7', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 9, name: 'eighth', value: '8', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 10, name: 'ninth', value: '9', hasNamedChildren: false, indexedChildrenCount: 0 },
            { id: 11, name: 'tenth', value: '10', hasNamedChildren: false, indexedChildrenCount: 0 },
        ];
        const variables = await dataSource.getChildren(parent);
        assert.equal(variables.length, 5, 'Iterating should have been cancelled');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1ZhcmlhYmxlc0RhdGFTb3VyY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUF1QixtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRzlGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sd0VBQXdFLENBQUE7QUFRL0UsS0FBSyxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUN4QyxJQUFJLFVBQXNDLENBQUE7SUFDMUMsTUFBTSxhQUFhLEdBQUcsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFrQyxDQUFBO0lBQ2pHLElBQUksc0JBQStCLENBQUE7SUFHbkMsSUFBSSxPQUFvQyxDQUFBO0lBRXhDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFNLFNBQVEsSUFBSSxFQUFtQjtRQUFyQzs7WUFDVix3QkFBbUIsR0FBRyxJQUFJLENBQUE7UUF1QnBDLENBQUM7UUF0QlMsZ0JBQWdCLENBQ3hCLFdBQWdCLEVBQ2hCLFFBQTRCLEVBQzVCLElBQXlCLEVBQ3pCLEtBQWEsRUFDYixLQUF3QjtZQUV4QixzQkFBc0IsR0FBRyxJQUFJLENBQUE7WUFDN0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBbUIsRUFBbUIsQ0FBQTtZQUN6RCxL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