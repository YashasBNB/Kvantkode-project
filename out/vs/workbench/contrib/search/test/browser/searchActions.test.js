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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQWN0aW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hBY3Rpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBRXBILE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsdUJBQXVCLEdBQ3ZCLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDN0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDcEcsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixnQkFBZ0IsRUFDaEIseUJBQXlCLEdBQ3pCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4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