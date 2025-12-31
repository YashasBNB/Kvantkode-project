/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { SearchModelImpl } from '../../browser/searchTreeModel/searchModel.js';
import { URI } from '../../../../../base/common/uri.js';
import { TextSearchMatch, OneLineRange, } from '../../../../services/search/common/search.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IReplaceService } from '../../browser/replace.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { MockLabelService } from '../../../../services/label/test/common/mockLabelService.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { TestEditorGroupsService, TestEditorService, } from '../../../../test/browser/workbenchTestServices.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { CellKind } from '../../../notebook/common/notebookCommon.js';
import { addToSearchResult, createFileUriFromPathFromRoot, getRootName, } from './searchTestCommon.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellMatch, NotebookCompatibleFileMatch, } from '../../browser/notebookSearch/notebookSearchModel.js';
import { MATCH_PREFIX, } from '../../browser/searchTreeModel/searchTreeCommon.js';
import { FolderMatchImpl } from '../../browser/searchTreeModel/folderMatch.js';
import { SearchResultImpl } from '../../browser/searchTreeModel/searchResult.js';
import { MatchImpl } from '../../browser/searchTreeModel/match.js';
const lineOneRange = new OneLineRange(1, 0, 1);
suite('SearchResult', () => {
    let instantiationService;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        instantiationService.stub(IModelService, stubModelService(instantiationService));
        instantiationService.stub(INotebookEditorService, stubNotebookEditorService(instantiationService));
        const fileService = new FileService(new NullLogService());
        store.add(fileService);
        const uriIdentityService = new UriIdentityService(fileService);
        store.add(uriIdentityService);
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        instantiationService.stubPromise(IReplaceService, {});
        instantiationService.stub(IReplaceService, 'replace', () => Promise.resolve(null));
        instantiationService.stub(ILabelService, new MockLabelService());
        instantiationService.stub(ILogService, new NullLogService());
    });
    teardown(() => {
        instantiationService.dispose();
    });
    test('Line Match', function () {
        const fileMatch = aFileMatch('folder/file.txt', null);
        const lineMatch = new MatchImpl(fileMatch, ['0 foo bar'], new OneLineRange(0, 2, 5), new OneLineRange(1, 0, 5), false);
        assert.strictEqual(lineMatch.text(), '0 foo bar');
        assert.strictEqual(lineMatch.range().startLineNumber, 2);
        assert.strictEqual(lineMatch.range().endLineNumber, 2);
        assert.strictEqual(lineMatch.range().startColumn, 1);
        assert.strictEqual(lineMatch.range().endColumn, 6);
        assert.strictEqual(lineMatch.id(), MATCH_PREFIX + 'file:///folder/file.txt>[2,1 -> 2,6]foo');
        assert.strictEqual(lineMatch.fullMatchText(), 'foo');
        assert.strictEqual(lineMatch.fullMatchText(true), '0 foo bar');
    });
    test('Line Match - Remove', function () {
        const fileMatch = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo bar', new OneLineRange(1, 0, 3)));
        const lineMatch = fileMatch.matches()[0];
        fileMatch.remove(lineMatch);
        assert.strictEqual(fileMatch.matches().length, 0);
    });
    test('File Match', function () {
        let fileMatch = aFileMatch('folder/file.txt', aSearchResult());
        assert.strictEqual(fileMatch.matches().length, 0);
        assert.strictEqual(fileMatch.resource.toString(), 'file:///folder/file.txt');
        assert.strictEqual(fileMatch.name(), 'file.txt');
        fileMatch = aFileMatch('file.txt', aSearchResult());
        assert.strictEqual(fileMatch.matches().length, 0);
        assert.strictEqual(fileMatch.resource.toString(), 'file:///file.txt');
        assert.strictEqual(fileMatch.name(), 'file.txt');
    });
    test('File Match: Select an existing match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        assert.strictEqual(testObject.matches()[0], testObject.getSelectedMatch());
    });
    test('File Match: Select non existing match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        const target = testObject.matches()[0];
        testObject.remove(target);
        testObject.setSelectedMatch(target);
        assert.strictEqual(testObject.getSelectedMatch(), null);
    });
    test('File Match: isSelected return true for selected match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        const target = testObject.matches()[0];
        testObject.setSelectedMatch(target);
        assert.ok(testObject.isMatchSelected(target));
    });
    test('File Match: isSelected return false for un-selected match', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        assert.ok(!testObject.isMatchSelected(testObject.matches()[1]));
    });
    test('File Match: unselect', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(testObject.matches()[0]);
        testObject.setSelectedMatch(null);
        assert.strictEqual(null, testObject.getSelectedMatch());
    });
    test('File Match: unselect when not selected', function () {
        const testObject = aFileMatch('folder/file.txt', aSearchResult(), new TextSearchMatch('foo', new OneLineRange(1, 0, 3)), new TextSearchMatch('bar', new OneLineRange(1, 5, 3)));
        testObject.setSelectedMatch(null);
        assert.strictEqual(null, testObject.getSelectedMatch());
    });
    test('Match -> FileMatch -> SearchResult hierarchy exists', function () {
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        const searchResult = instantiationService.createInstance(SearchResultImpl, searchModel);
        store.add(searchResult);
        const fileMatch = aFileMatch('far/boo', searchResult);
        const lineMatch = new MatchImpl(fileMatch, ['foo bar'], new OneLineRange(0, 0, 3), new OneLineRange(1, 0, 3), false);
        assert(lineMatch.parent() === fileMatch);
        assert(fileMatch.parent() === searchResult.folderMatches()[0]);
    });
    test('Adding a raw match will add a file match with line matches', function () {
        const testObject = aSearchResult();
        const target = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)), new TextSearchMatch('preview 2', lineOneRange)),
        ];
        addToSearchResult(testObject, target);
        assert.strictEqual(3, testObject.count());
        const actual = testObject.matches();
        assert.strictEqual(1, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        const actuaMatches = actual[0].matches();
        assert.strictEqual(3, actuaMatches.length);
        assert.strictEqual('preview 1', actuaMatches[0].text());
        assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
        assert.strictEqual('preview 1', actuaMatches[1].text());
        assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));
        assert.strictEqual('preview 2', actuaMatches[2].text());
        assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[2].range()));
    });
    test('Adding multiple raw matches', function () {
        const testObject = aSearchResult();
        const target = [
            aRawMatch('/1', new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)), new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ];
        addToSearchResult(testObject, target);
        assert.strictEqual(3, testObject.count());
        const actual = testObject.matches();
        assert.strictEqual(2, actual.length);
        assert.strictEqual(URI.file(`${getRootName()}/1`).toString(), actual[0].resource.toString());
        let actuaMatches = actual[0].matches();
        assert.strictEqual(2, actuaMatches.length);
        assert.strictEqual('preview 1', actuaMatches[0].text());
        assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
        assert.strictEqual('preview 1', actuaMatches[1].text());
        assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));
        actuaMatches = actual[1].matches();
        assert.strictEqual(1, actuaMatches.length);
        assert.strictEqual('preview 2', actuaMatches[0].text());
        assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[0].range()));
    });
    test('Test that notebook matches get added correctly', function () {
        const testObject = aSearchResult();
        const cell1 = { cellKind: CellKind.Code };
        const cell2 = { cellKind: CellKind.Code };
        sinon.stub(CellMatch.prototype, 'addContext');
        const addFileMatch = sinon.spy(FolderMatchImpl.prototype, 'addFileMatch');
        const fileMatch1 = aRawFileMatchWithCells('/1', {
            cell: cell1,
            index: 0,
            contentResults: [new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4))],
            webviewResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)),
                new TextSearchMatch('preview 2', lineOneRange),
            ],
        });
        const fileMatch2 = aRawFileMatchWithCells('/2', {
            cell: cell2,
            index: 0,
            contentResults: [new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4))],
            webviewResults: [
                new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)),
                new TextSearchMatch('preview 2', lineOneRange),
            ],
        });
        const target = [fileMatch1, fileMatch2];
        addToSearchResult(testObject, target);
        assert.strictEqual(6, testObject.count());
        assert.deepStrictEqual(fileMatch1.cellResults[0].contentResults, addFileMatch.getCall(0).args[0][0].cellResults[0]
            .contentResults);
        assert.deepStrictEqual(fileMatch1.cellResults[0].webviewResults, addFileMatch.getCall(0).args[0][0].cellResults[0]
            .webviewResults);
        assert.deepStrictEqual(fileMatch2.cellResults[0].contentResults, addFileMatch.getCall(0).args[0][1].cellResults[0]
            .contentResults);
        assert.deepStrictEqual(fileMatch2.cellResults[0].webviewResults, addFileMatch.getCall(0).args[0][1].cellResults[0]
            .webviewResults);
    });
    test('Dispose disposes matches', function () {
        const target1 = sinon.spy();
        const target2 = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ]);
        store.add(testObject.matches()[0].onDispose(target1));
        store.add(testObject.matches()[1].onDispose(target2));
        testObject.dispose();
        assert.ok(testObject.isEmpty());
        assert.ok(target1.calledOnce);
        assert.ok(target2.calledOnce);
    });
    test('remove triggers change event', function () {
        const target = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))]);
        const objectToRemove = testObject.matches()[0];
        store.add(testObject.onChange(target));
        testObject.remove(objectToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: [objectToRemove], removed: true }], target.args[0]);
    });
    test('remove array triggers change event', function () {
        const target = sinon.spy();
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ]);
        const arrayToRemove = testObject.matches();
        store.add(testObject.onChange(target));
        testObject.remove(arrayToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: arrayToRemove, removed: true }], target.args[0]);
    });
    test('Removing all line matches and adding back will add file back to result', function () {
        const testObject = aSearchResult();
        addToSearchResult(testObject, [aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))]);
        const target = testObject.matches()[0];
        const matchToRemove = target.matches()[0];
        target.remove(matchToRemove);
        assert.ok(testObject.isEmpty());
        target.add(matchToRemove, true);
        assert.strictEqual(1, testObject.fileCount());
        assert.strictEqual(target, testObject.matches()[0]);
    });
    test('replace should remove the file match', function () {
        const voidPromise = Promise.resolve(null);
        instantiationService.stub(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))]);
        testObject.replace(testObject.matches()[0]);
        return voidPromise.then(() => assert.ok(testObject.isEmpty()));
    });
    test('replace should trigger the change event', function () {
        const target = sinon.spy();
        const voidPromise = Promise.resolve(null);
        instantiationService.stub(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange))]);
        store.add(testObject.onChange(target));
        const objectToRemove = testObject.matches()[0];
        testObject.replace(objectToRemove);
        return voidPromise.then(() => {
            assert.ok(target.calledOnce);
            assert.deepStrictEqual([{ elements: [objectToRemove], removed: true }], target.args[0]);
        });
    });
    test('replaceAll should remove all file matches', function () {
        const voidPromise = Promise.resolve(null);
        instantiationService.stubPromise(IReplaceService, 'replace', voidPromise);
        const testObject = aSearchResult();
        addToSearchResult(testObject, [
            aRawMatch('/1', new TextSearchMatch('preview 1', lineOneRange)),
            aRawMatch('/2', new TextSearchMatch('preview 2', lineOneRange)),
        ]);
        testObject.replaceAll(null);
        return voidPromise.then(() => assert.ok(testObject.isEmpty()));
    });
    test('batchRemove should trigger the onChange event correctly', function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResult();
        const folderMatch = testObject.folderMatches()[0];
        const fileMatch = testObject.folderMatches()[1].allDownstreamFileMatches()[0];
        const match = testObject.folderMatches()[1].allDownstreamFileMatches()[1].matches()[0];
        const arrayToRemove = [folderMatch, fileMatch, match];
        const expectedArrayResult = folderMatch
            .allDownstreamFileMatches()
            .concat([fileMatch, match.parent()]);
        store.add(testObject.onChange(target));
        testObject.batchRemove(arrayToRemove);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false }], target.args[0]);
    });
    test('batchReplace should trigger the onChange event correctly', async function () {
        const replaceSpy = sinon.spy();
        instantiationService.stub(IReplaceService, 'replace', (arg) => {
            if (Array.isArray(arg)) {
                replaceSpy(arg[0]);
            }
            else {
                replaceSpy(arg);
            }
            return Promise.resolve();
        });
        const target = sinon.spy();
        const testObject = getPopulatedSearchResult();
        const folderMatch = testObject.folderMatches()[0];
        const fileMatch = testObject.folderMatches()[1].allDownstreamFileMatches()[0];
        const match = testObject.folderMatches()[1].allDownstreamFileMatches()[1].matches()[0];
        const firstExpectedMatch = folderMatch.allDownstreamFileMatches()[0];
        const arrayToRemove = [folderMatch, fileMatch, match];
        store.add(testObject.onChange(target));
        await testObject.batchReplace(arrayToRemove);
        assert.ok(target.calledOnce);
        sinon.assert.calledThrice(replaceSpy);
        sinon.assert.calledWith(replaceSpy.firstCall, firstExpectedMatch);
        sinon.assert.calledWith(replaceSpy.secondCall, fileMatch);
        sinon.assert.calledWith(replaceSpy.thirdCall, match);
    });
    test('Creating a model with nested folders should create the correct structure', function () {
        const testObject = getPopulatedSearchResultForTreeTesting();
        const root0 = testObject.folderMatches()[0];
        const root1 = testObject.folderMatches()[1];
        const root2 = testObject.folderMatches()[2];
        const root3 = testObject.folderMatches()[3];
        const root0DownstreamFiles = root0.allDownstreamFileMatches();
        assert.deepStrictEqual(root0DownstreamFiles, [
            ...root0.fileMatchesIterator(),
            ...getFolderMatchAtIndex(root0, 0).fileMatchesIterator(),
        ]);
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).allDownstreamFileMatches(), Array.from(getFolderMatchAtIndex(root0, 0).fileMatchesIterator()));
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root0, 0), 0).parent(), getFolderMatchAtIndex(root0, 0));
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).parent(), root0);
        assert.deepStrictEqual(getFolderMatchAtIndex(root0, 0).closestRoot, root0);
        root0DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root0);
        });
        const root1DownstreamFiles = root1.allDownstreamFileMatches();
        assert.deepStrictEqual(root1.allDownstreamFileMatches(), [
            ...root1.fileMatchesIterator(),
            ...getFolderMatchAtIndex(root1, 0).fileMatchesIterator(),
        ]); // excludes the matches from nested root
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root1, 0), 0).parent(), getFolderMatchAtIndex(root1, 0));
        root1DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root1);
        });
        const root2DownstreamFiles = root2.allDownstreamFileMatches();
        assert.deepStrictEqual(root2DownstreamFiles, Array.from(root2.fileMatchesIterator()));
        assert.deepStrictEqual(getFileMatchAtIndex(root2, 0).parent(), root2);
        assert.deepStrictEqual(getFileMatchAtIndex(root2, 0).closestRoot, root2);
        const root3DownstreamFiles = root3.allDownstreamFileMatches();
        const root3Level3Folder = getFolderMatchAtIndex(getFolderMatchAtIndex(root3, 0), 0);
        assert.deepStrictEqual(root3DownstreamFiles, [
            ...root3.fileMatchesIterator(),
            ...getFolderMatchAtIndex(root3Level3Folder, 0).fileMatchesIterator(),
            ...getFolderMatchAtIndex(root3Level3Folder, 1).fileMatchesIterator(),
        ].flat());
        assert.deepStrictEqual(root3Level3Folder.allDownstreamFileMatches(), getFolderMatchAtIndex(root3, 0).allDownstreamFileMatches());
        assert.deepStrictEqual(getFileMatchAtIndex(getFolderMatchAtIndex(root3Level3Folder, 1), 0).parent(), getFolderMatchAtIndex(root3Level3Folder, 1));
        assert.deepStrictEqual(getFolderMatchAtIndex(root3Level3Folder, 1).parent(), root3Level3Folder);
        assert.deepStrictEqual(root3Level3Folder.parent(), getFolderMatchAtIndex(root3, 0));
        root3DownstreamFiles.forEach((e) => {
            assert.deepStrictEqual(e.closestRoot, root3);
        });
    });
    test('Removing an intermediate folder should call OnChange() on all downstream file matches', function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResultForTreeTesting();
        const folderMatch = getFolderMatchAtIndex(getFolderMatchAtIndex(getFolderMatchAtIndex(testObject.folderMatches()[3], 0), 0), 0);
        const expectedArrayResult = folderMatch.allDownstreamFileMatches();
        store.add(testObject.onChange(target));
        testObject.remove(folderMatch);
        assert.ok(target.calledOnce);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false, clearingAll: false }], target.args[0]);
    });
    test('Replacing an intermediate folder should remove all downstream folders and file matches', async function () {
        const target = sinon.spy();
        const testObject = getPopulatedSearchResultForTreeTesting();
        const folderMatch = getFolderMatchAtIndex(testObject.folderMatches()[3], 0);
        const expectedArrayResult = folderMatch.allDownstreamFileMatches();
        store.add(testObject.onChange(target));
        await testObject.batchReplace([folderMatch]);
        assert.deepStrictEqual([{ elements: expectedArrayResult, removed: true, added: false }], target.args[0]);
    });
    function aFileMatch(path, searchResult, ...lineMatches) {
        if (!searchResult) {
            searchResult = aSearchResult();
        }
        const rawMatch = {
            resource: URI.file('/' + path),
            results: lineMatches,
        };
        const root = searchResult?.folderMatches()[0];
        const fileMatch = instantiationService.createInstance(NotebookCompatibleFileMatch, {
            pattern: '',
        }, undefined, undefined, root, rawMatch, null, '');
        fileMatch.createMatches();
        store.add(fileMatch);
        return fileMatch;
    }
    function aSearchResult() {
        const searchModel = instantiationService.createInstance(SearchModelImpl);
        store.add(searchModel);
        searchModel.searchResult.query = {
            type: 2 /* QueryType.Text */,
            folderQueries: [{ folder: createFileUriFromPathFromRoot() }],
            contentPattern: {
                pattern: '',
            },
        };
        return searchModel.searchResult;
    }
    function aRawMatch(resource, ...results) {
        return { resource: createFileUriFromPathFromRoot(resource), results };
    }
    function aRawFileMatchWithCells(resource, ...cellMatches) {
        return {
            resource: createFileUriFromPathFromRoot(resource),
            cellResults: cellMatches,
        };
    }
    function stubModelService(instantiationService) {
        instantiationService.stub(IThemeService, new TestThemeService());
        const config = new TestConfigurationService();
        config.setUserConfiguration('search', { searchOnType: true });
        instantiationService.stub(IConfigurationService, config);
        const modelService = instantiationService.createInstance(ModelService);
        store.add(modelService);
        return modelService;
    }
    function stubNotebookEditorService(instantiationService) {
        instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        instantiationService.stub(IEditorService, store.add(new TestEditorService()));
        const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
        store.add(notebookEditorWidgetService);
        return notebookEditorWidgetService;
    }
    function getPopulatedSearchResult() {
        const testObject = aSearchResult();
        testObject.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [
                {
                    folder: createFileUriFromPathFromRoot('/voo'),
                },
                { folder: createFileUriFromPathFromRoot('/with') },
            ],
        };
        addToSearchResult(testObject, [
            aRawMatch('/voo/foo.a', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/with/path/bar.b', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/path.c', new TextSearchMatch('preview 4', lineOneRange), new TextSearchMatch('preview 5', lineOneRange)),
        ]);
        return testObject;
    }
    function getPopulatedSearchResultForTreeTesting() {
        const testObject = aSearchResult();
        testObject.query = {
            type: 2 /* QueryType.Text */,
            contentPattern: { pattern: 'foo' },
            folderQueries: [
                {
                    folder: createFileUriFromPathFromRoot('/voo'),
                },
                {
                    folder: createFileUriFromPathFromRoot('/with'),
                },
                {
                    folder: createFileUriFromPathFromRoot('/with/test'),
                },
                {
                    folder: createFileUriFromPathFromRoot('/eep'),
                },
            ],
        };
        /***
         * file structure looks like:
         * *voo/
         * |- foo.a
         * |- beep
         *    |- foo.c
         * 	  |- boop.c
         * *with/
         * |- path
         *    |- bar.b
         * |- path.c
         * |- *test/
         *    |- woo.c
         * eep/
         *    |- bar
         *       |- goo
         *           |- foo
         *              |- here.txt
         * 			 |- ooo
         *              |- there.txt
         *    |- eyy.y
         */
        addToSearchResult(testObject, [
            aRawMatch('/voo/foo.a', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/voo/beep/foo.c', new TextSearchMatch('preview 1', lineOneRange), new TextSearchMatch('preview 2', lineOneRange)),
            aRawMatch('/voo/beep/boop.c', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/path.c', new TextSearchMatch('preview 4', lineOneRange), new TextSearchMatch('preview 5', lineOneRange)),
            aRawMatch('/with/path/bar.b', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/with/test/woo.c', new TextSearchMatch('preview 3', lineOneRange)),
            aRawMatch('/eep/bar/goo/foo/here.txt', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange)),
            aRawMatch('/eep/bar/goo/ooo/there.txt', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange)),
            aRawMatch('/eep/eyy.y', new TextSearchMatch('preview 6', lineOneRange), new TextSearchMatch('preview 7', lineOneRange)),
        ]);
        return testObject;
    }
    function getFolderMatchAtIndex(parent, index) {
        return Array.from(parent.folderMatchesIterator())[index];
    }
    function getFileMatchAtIndex(parent, index) {
        return Array.from(parent.fileMatchesIterator())[index];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvdGVzdC9icm93c2VyL3NlYXJjaFJlc3VsdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQTtBQUM5QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFFTixlQUFlLEVBQ2YsWUFBWSxHQUdaLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzFELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrREFB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QUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFckUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV0RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3RFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1FBQ25DLE1BQU0sVUFBVSxHQUFHLGFBQWEsRUFBRSxDQUFBO1FBQ2xDLE1BQU0sTUFBTSxHQUFHO1lBQ2QsU0FBUyxDQUNSLElBQUksRUFDSixJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUMzRCxJQUFJLGVBQWUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMs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