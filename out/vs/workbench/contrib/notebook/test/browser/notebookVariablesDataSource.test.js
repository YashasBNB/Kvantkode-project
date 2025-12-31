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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay90ZXN0L2Jyb3dzZXIvbm90ZWJvb2tWYXJpYWJsZXNEYXRhU291cmNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBdUIsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUc5RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHdFQUF3RSxDQUFBO0FBUS9FLEtBQUssQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7SUFDeEMsSUFBSSxVQUFzQyxDQUFBO0lBQzFDLE1BQU0sYUFBYSxHQUFHLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBa0MsQ0FBQTtJQUNqRyxJQUFJLHNCQUErQixDQUFBO0lBR25DLElBQUksT0FBb0MsQ0FBQTtJQUV4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLElBQUksRUFBbUI7UUFBckM7O1lBQ1Ysd0JBQW1CLEdBQUcsSUFBSSxDQUFBO1FBdUJwQyxDQUFDO1FBdEJTLGdCQUFnQixDQUN4QixXQUFnQixFQUNoQixRQUE0QixFQUM1QixJQUF5QixFQUN6QixLQUFhLEVBQ2IsS0FBd0I7WUFFeEIsc0JBQXNCLEdBQUcsSUFBSSxDQUFBO1lBQzdCLE1BQU0sTUFBTSxHQUFHLElBQUksbUJBQW1CLEVBQW1CLENBQUE7WUFDekQsS0FBSyxJ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