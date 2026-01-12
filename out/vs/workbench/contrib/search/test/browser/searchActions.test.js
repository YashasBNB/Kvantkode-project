/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { OS } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { USLayoutResolvedKeybinding } from '../../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
import { getElementToFocusAfterRemoved, getLastNodeFromSameType, } from '../../browser/searchActionsRemoveReplace.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { MockObjectTree } from './mockSearchTree.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { createFileUriFromPathFromRoot, stubModelService, stubNotebookEditorService, } from './searchTestCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { NotebookCompatibleFileMatch } from '../../browser/notebookSearch/notebookSearchModel.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
suite('Search Actions', () => {
    let instantiationService;
    let counter;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(IModelService, stubModelService(instantiationService, (e) => store.add(e)));
        instantiationService.stub(INotebookEditorService, stubNotebookEditorService(instantiationService, (e) => store.add(e)));
        instantiationService.stub(IKeybindingService, {});
        instantiationService.stub(ILabelService, { getUriBasenameLabel: (uri) => '' });
        instantiationService.stub(IKeybindingService, 'resolveKeybinding', (keybinding) => USLayoutResolvedKeybinding.resolveKeybinding(keybinding, OS));
        instantiationService.stub(IKeybindingService, 'lookupKeybinding', (id) => null);
        instantiationService.stub(IKeybindingService, 'lookupKeybinding', (id) => null);
        counter = 0;
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('get next element to focus after removing a match when it has next sibling file', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const data = [
            fileMatch1,
            aMatch(fileMatch1),
            aMatch(fileMatch1),
            fileMatch2,
            aMatch(fileMatch2),
            aMatch(fileMatch2),
        ];
        const tree = aTree(data);
        const target = data[2];
        const actual = await getElementToFocusAfterRemoved(tree, target, [target]);
        assert.strictEqual(data[4], actual);
    });
    test('get next element to focus after removing a match when it is the only match', async function () {
        const fileMatch1 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1)];
        const tree = aTree(data);
        const target = data[1];
        const actual = await getElementToFocusAfterRemoved(tree, target, [target]);
        assert.strictEqual(undefined, actual);
    });
    test('get next element to focus after removing a file match when it has next sibling', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [
            fileMatch1,
            aMatch(fileMatch1),
            fileMatch2,
            aMatch(fileMatch2),
            fileMatch3,
            aMatch(fileMatch3),
        ];
        const tree = aTree(data);
        const target = data[2];
        const actual = await getElementToFocusAfterRemoved(tree, target, []);
        assert.strictEqual(data[4], actual);
    });
    test('Find last FileMatch in Tree', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [
            fileMatch1,
            aMatch(fileMatch1),
            fileMatch2,
            aMatch(fileMatch2),
            fileMatch3,
            aMatch(fileMatch3),
        ];
        const tree = aTree(data);
        const actual = await getLastNodeFromSameType(tree, fileMatch1);
        assert.strictEqual(fileMatch3, actual);
    });
    test('Find last Match in Tree', async function () {
        const fileMatch1 = aFileMatch();
        const fileMatch2 = aFileMatch();
        const fileMatch3 = aFileMatch();
        const data = [
            fileMatch1,
            aMatch(fileMatch1),
            fileMatch2,
            aMatch(fileMatch2),
            fileMatch3,
            aMatch(fileMatch3),
        ];
        const tree = aTree(data);
        const actual = await getLastNodeFromSameType(tree, aMatch(fileMatch1));
        assert.strictEqual(data[5], actual);
    });
    test('get next element to focus after removing a file match when it is only match', async function () {
        const fileMatch1 = aFileMatch();
        const data = [fileMatch1, aMatch(fileMatch1)];
        const tree = aTree(data);
        const target = data[0];
        // const testObject: ReplaceAction = instantiationService.createInstance(ReplaceAction, tree, target, null);
        const actual = await getElementToFocusAfterRemoved(tree, target, []);
        assert.strictEqual(undefined, actual);
    });
    function aFileMatch() {
        const uri = URI.file('somepath' + ++counter);
        const rawMatch = {
            resource: uri,
            results: [],
        };
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        const folderMatch = instantiationService.createInstance(FolderMatchImpl, URI.file('somepath'), '', 0, {
            type: 2 /* QueryType.Text */,
            folderQueries: [{ folder: createFileUriFromPathFromRoot() }],
            contentPattern: {
                pattern: '',
            },
        }, searchModel.searchResult.plainTextSearchResult, searchModel.searchResult, null);
        store.add(folderMatch);
        const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
            pattern: '',
        }, undefined, undefined, folderMatch, rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aMatch(fileMatch) {
        const line = ++counter;
        const match = new MatchImpl(fileMatch, ['some match'], {
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: 0,
            endColumn: 2,
        }, {
            startLineNumber: line,
            startColumn: 0,
            endLineNumber: line,
            endColumn: 2,
        }, false);
        fileMatch.add(match);
        return match;
    }
    function aTree(elements) {
        return new MockObjectTree(elements);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL3NlYXJjaEFjdGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLEVBQUUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0seUVBQXlFLENBQUE7QUFFcEgsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qix1QkFBdUIsR0FDdkIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLGdCQUFnQixFQUNoQix5QkFBeUIsR0FDekIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0s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