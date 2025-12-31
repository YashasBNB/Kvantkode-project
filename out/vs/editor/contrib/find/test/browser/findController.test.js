/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Delayer } from '../../../../../base/common/async.js';
import * as platform from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditOperation } from '../../../../common/core/editOperation.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { CommonFindController, NextMatchFindAction, NextSelectionMatchFindAction, StartFindAction, StartFindReplaceAction, StartFindWithSelectionAction, } from '../../browser/findController.js';
import { CONTEXT_FIND_INPUT_FOCUSED } from '../../browser/findModel.js';
import { withAsyncTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IStorageService, InMemoryStorageService, } from '../../../../../platform/storage/common/storage.js';
let TestFindController = class TestFindController extends CommonFindController {
    constructor(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService) {
        super(editor, contextKeyService, storageService, clipboardService, notificationService, hoverService);
        this.delayUpdateHistory = false;
        this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.bindTo(contextKeyService);
        this._updateHistoryDelayer = new Delayer(50);
        this.hasFocus = false;
    }
    async _start(opts) {
        await super._start(opts);
        if (opts.shouldFocus !== 0 /* FindStartFocusAction.NoFocusChange */) {
            this.hasFocus = true;
        }
        const inputFocused = opts.shouldFocus === 1 /* FindStartFocusAction.FocusFindInput */;
        this._findInputFocused.set(inputFocused);
    }
};
TestFindController = __decorate([
    __param(1, IContextKeyService),
    __param(2, IStorageService),
    __param(3, IClipboardService),
    __param(4, INotificationService),
    __param(5, IHoverService)
], TestFindController);
function fromSelection(slc) {
    return [slc.startLineNumber, slc.startColumn, slc.endLineNumber, slc.endColumn];
}
function executeAction(instantiationService, editor, action, args) {
    return instantiationService.invokeFunction((accessor) => {
        return Promise.resolve(action.runEditorCommand(accessor, editor, args));
    });
}
suite('FindController', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    let clipboardState = '';
    const serviceCollection = new ServiceCollection();
    serviceCollection.set(IStorageService, new InMemoryStorageService());
    if (platform.isMacintosh) {
        serviceCollection.set(IClipboardService, {
            readFindText: () => clipboardState,
            writeFindText: (value) => {
                clipboardState = value;
            },
        });
    }
    /* test('stores to the global clipboard buffer on start find action', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }
            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let startFindAction = new StartFindAction();
            // I select ABC on the first line
            editor.setSelection(new Selection(1, 1, 1, 4));
            // I hit Ctrl+F to show the Find dialog
            startFindAction.run(null, editor);

            assert.deepStrictEqual(findController.getGlobalBufferTerm(), findController.getState().searchString);
            findController.dispose();
        });
    });

    test('reads from the global clipboard buffer on next find action if buffer exists', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = 'ABC';

            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }

            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let findState = findController.getState();
            let nextMatchFindAction = new NextMatchFindAction();

            nextMatchFindAction.run(null, editor);
            assert.strictEqual(findState.searchString, 'ABC');

            assert.deepStrictEqual(fromSelection(editor.getSelection()!), [1, 1, 1, 4]);

            findController.dispose();
        });
    });

    test('writes to the global clipboard buffer when text changes', async () => {
        await withAsyncTestCodeEditor([
            'ABC',
            'ABC',
            'XYZ',
            'ABC'
        ], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            if (!platform.isMacintosh) {
                assert.ok(true);
                return;
            }

            let findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            let findState = findController.getState();

            findState.change({ searchString: 'ABC' }, true);

            assert.deepStrictEqual(findController.getGlobalBufferTerm(), 'ABC');

            findController.dispose();
        });
    }); */
    test('issue #1857: F3, Find Next, acts like "Find Under Cursor"', async () => {
        await withAsyncTestCodeEditor(['ABC', 'ABC', 'XYZ', 'ABC'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            const nextMatchFindAction = new NextMatchFindAction();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type ABC.
            findState.change({ searchString: 'A' }, true);
            findState.change({ searchString: 'AB' }, true);
            findState.change({ searchString: 'ABC' }, true);
            // The first ABC is highlighted.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 1, 1, 4]);
            // I hit Esc to exit the Find dialog.
            findController.closeFindWidget();
            findController.hasFocus = false;
            // The cursor is now at end of the first line, with ABC on that line highlighted.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 1, 1, 4]);
            // I hit delete to remove it and change the text to XYZ.
            editor.pushUndoStop();
            editor.executeEdits('test', [EditOperation.delete(new Range(1, 1, 1, 4))]);
            editor.executeEdits('test', [EditOperation.insert(new Position(1, 1), 'XYZ')]);
            editor.pushUndoStop();
            // At this point the text editor looks like this:
            //   XYZ
            //   ABC
            //   XYZ
            //   ABC
            assert.strictEqual(editor.getModel().getLineContent(1), 'XYZ');
            // The cursor is at end of the first line.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 4, 1, 4]);
            // I hit F3 to "Find Next" to find the next occurrence of ABC, but instead it searches for XYZ.
            await nextMatchFindAction.run(null, editor);
            assert.strictEqual(findState.searchString, 'ABC');
            assert.strictEqual(findController.hasFocus, false);
            findController.dispose();
        });
    });
    test('issue #3090: F3 does not loop with two matches on a single line', async () => {
        await withAsyncTestCodeEditor(["import nls = require('vs/nls');"], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            editor.setPosition({
                lineNumber: 1,
                column: 9,
            });
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 26, 1, 29]);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 8, 1, 11]);
            findController.dispose();
        });
    });
    test('issue #6149: Auto-escape highlighted text for search and replace regex mode', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3  * 5)'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            editor.setSelection(new Selection(1, 9, 1, 13));
            findController.toggleRegex();
            await executeAction(instantiationService, editor, StartFindAction);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 9, 2, 13]);
            await nextMatchFindAction.run(null, editor);
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [1, 9, 1, 13]);
            findController.dispose();
        });
    });
    test("issue #41027: Don't replace find input value on replace action if find input is active", async () => {
        await withAsyncTestCodeEditor(['test'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            const testRegexString = 'tes.';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextMatchFindAction = new NextMatchFindAction();
            findController.toggleRegex();
            findController.setSearchString(testRegexString);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 1 /* FindStartFocusAction.FocusFindInput */,
                shouldAnimate: false,
                updateSearchScope: false,
                loop: true,
            });
            await nextMatchFindAction.run(null, editor);
            await executeAction(instantiationService, editor, StartFindReplaceAction);
            assert.strictEqual(findController.getState().searchString, testRegexString);
            findController.dispose();
        });
    });
    test('issue #9043: Clear search scope when find widget is hidden', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: false,
                loop: true,
            });
            assert.strictEqual(findController.getState().searchScope, null);
            findController.getState().change({
                searchScope: [new Range(1, 1, 1, 5)],
            }, false);
            assert.deepStrictEqual(findController.getState().searchScope, [new Range(1, 1, 1, 5)]);
            findController.closeFindWidget();
            assert.strictEqual(findController.getState().searchScope, null);
        });
    });
    test('issue #18111: Regex replace with single space replaces with no space', async () => {
        await withAsyncTestCodeEditor(['HRESULT OnAmbientPropertyChange(DISPID   dispid);'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await executeAction(instantiationService, editor, StartFindAction);
            findController
                .getState()
                .change({ searchString: '\\b\\s{3}\\b', replaceString: ' ', isRegex: true }, false);
            findController.moveToNextMatch();
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [[1, 39, 1, 42]]);
            findController.replace();
            assert.deepStrictEqual(editor.getValue(), 'HRESULT OnAmbientPropertyChange(DISPID dispid);');
            findController.dispose();
        });
    });
    test('issue #24714: Regular expression with ^ in search & replace', async () => {
        await withAsyncTestCodeEditor(['', 'line2', 'line3'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await executeAction(instantiationService, editor, StartFindAction);
            findController
                .getState()
                .change({ searchString: '^', replaceString: 'x', isRegex: true }, false);
            findController.moveToNextMatch();
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [[2, 1, 2, 1]]);
            findController.replace();
            assert.deepStrictEqual(editor.getValue(), '\nxline2\nline3');
            findController.dispose();
        });
    });
    test('issue #38232: Find Next Selection, regex enabled', async () => {
        await withAsyncTestCodeEditor(['([funny]', '', '([funny]'], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextSelectionMatchFindAction = new NextSelectionMatchFindAction();
            // toggle regex
            findController.getState().change({ isRegex: true }, false);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 9));
            // cmd+f3
            await nextSelectionMatchFindAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [[3, 1, 3, 9]]);
            findController.dispose();
        });
    });
    test('issue #38232: Find Next Selection, regex enabled, find widget open', async () => {
        await withAsyncTestCodeEditor(['([funny]', '', '([funny]'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const nextSelectionMatchFindAction = new NextSelectionMatchFindAction();
            // cmd+f - open find widget
            await executeAction(instantiationService, editor, StartFindAction);
            // toggle regex
            findController.getState().change({ isRegex: true }, false);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 9));
            // cmd+f3
            await nextSelectionMatchFindAction.run(null, editor);
            assert.deepStrictEqual(editor.getSelections().map(fromSelection), [[3, 1, 3, 9]]);
            findController.dispose();
        });
    });
    test('issue #47400, CMD+E supports feeding multiple line of text into the find widget', async () => {
        await withAsyncTestCodeEditor(['ABC', 'ABC', 'XYZ', 'ABC', 'ABC'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            // change selection
            editor.setSelection(new Selection(1, 1, 1, 1));
            // cmd+f - open find widget
            await executeAction(instantiationService, editor, StartFindAction);
            editor.setSelection(new Selection(1, 1, 2, 4));
            const startFindWithSelectionAction = new StartFindWithSelectionAction();
            await startFindWithSelectionAction.run(null, editor);
            const findState = findController.getState();
            assert.deepStrictEqual(findState.searchString.split(/\r\n|\r|\n/g), ['ABC', 'ABC']);
            editor.setSelection(new Selection(3, 1, 3, 1));
            await startFindWithSelectionAction.run(null, editor);
            findController.dispose();
        });
    });
    test('issue #109756, CMD+E with empty cursor should always work', async () => {
        await withAsyncTestCodeEditor(['ABC', 'ABC', 'XYZ', 'ABC', 'ABC'], { serviceCollection: serviceCollection }, async (editor) => {
            clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            editor.setSelection(new Selection(1, 2, 1, 2));
            const startFindWithSelectionAction = new StartFindWithSelectionAction();
            startFindWithSelectionAction.run(null, editor);
            const findState = findController.getState();
            assert.deepStrictEqual(findState.searchString, 'ABC');
            findController.dispose();
        });
    });
});
suite('FindController query options persistence', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const serviceCollection = new ServiceCollection();
    const storageService = new InMemoryStorageService();
    storageService.store('editor.isRegex', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.matchCase', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.wholeWord', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    serviceCollection.set(IStorageService, storageService);
    test('matchCase', async () => {
        await withAsyncTestCodeEditor(['abc', 'ABC', 'XYZ', 'ABC'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            storageService.store('editor.matchCase', true, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type ABC.
            findState.change({ searchString: 'ABC' }, true);
            // The second ABC is highlighted as matchCase is true.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 1, 2, 4]);
            findController.dispose();
        });
    });
    storageService.store('editor.matchCase', false, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    storageService.store('editor.wholeWord', true, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    test('wholeWord', async () => {
        await withAsyncTestCodeEditor(['ABC', 'AB', 'XYZ', 'ABC'], { serviceCollection: serviceCollection }, async (editor, _, instantiationService) => {
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findState = findController.getState();
            // I hit Ctrl+F to show the Find dialog
            await executeAction(instantiationService, editor, StartFindAction);
            // I type AB.
            findState.change({ searchString: 'AB' }, true);
            // The second AB is highlighted as wholeWord is true.
            assert.deepStrictEqual(fromSelection(editor.getSelection()), [2, 1, 2, 3]);
            findController.dispose();
        });
    });
    test('toggling options is saved', async () => {
        await withAsyncTestCodeEditor(['ABC', 'AB', 'XYZ', 'ABC'], { serviceCollection: serviceCollection }, async (editor) => {
            // The cursor is at the very top, of the file, at the first ABC
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            findController.toggleRegex();
            assert.strictEqual(storageService.getBoolean('editor.isRegex', 1 /* StorageScope.WORKSPACE */), true);
            findController.dispose();
        });
    });
    test('issue #27083: Update search scope once find widget becomes visible', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], {
            serviceCollection: serviceCollection,
            find: { autoFindInSelection: 'always', globalFindClipboard: false },
        }, async (editor) => {
            // clipboardState = '';
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            const findConfig = {
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true,
            };
            editor.setSelection(new Range(1, 1, 2, 1));
            findController.start(findConfig);
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 1, 2, 1)]);
            findController.closeFindWidget();
            editor.setSelections([new Selection(1, 1, 2, 1), new Selection(2, 1, 2, 5)]);
            findController.start(findConfig);
            assert.deepStrictEqual(findController.getState().searchScope, [
                new Selection(1, 1, 2, 1),
                new Selection(2, 1, 2, 5),
            ]);
        });
    });
    test('issue #58604: Do not update searchScope if it is empty', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], {
            serviceCollection: serviceCollection,
            find: { autoFindInSelection: 'always', globalFindClipboard: false },
        }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 2, 1, 2));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true,
            });
            assert.deepStrictEqual(findController.getState().searchScope, null);
        });
    });
    test('issue #58604: Update searchScope if it is not empty', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], {
            serviceCollection: serviceCollection,
            find: { autoFindInSelection: 'always', globalFindClipboard: false },
        }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 2, 1, 3));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true,
            });
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 2, 1, 3)]);
        });
    });
    test('issue #27083: Find in selection when multiple lines are selected', async () => {
        await withAsyncTestCodeEditor(['var x = (3 * 5)', 'var y = (3 * 5)', 'var z = (3 * 5)'], {
            serviceCollection: serviceCollection,
            find: { autoFindInSelection: 'multiline', globalFindClipboard: false },
        }, async (editor) => {
            // clipboardState = '';
            editor.setSelection(new Range(1, 6, 2, 1));
            const findController = editor.registerAndInstantiateContribution(TestFindController.ID, TestFindController);
            await findController.start({
                forceRevealReplace: false,
                seedSearchStringFromSelection: 'none',
                seedSearchStringFromNonEmptySelection: false,
                seedSearchStringFromGlobalClipboard: false,
                shouldFocus: 0 /* FindStartFocusAction.NoFocusChange */,
                shouldAnimate: false,
                updateSearchScope: true,
                loop: true,
            });
            assert.deepStrictEqual(findController.getState().searchScope, [new Selection(1, 6, 2, 1)]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvdGVzdC9icm93c2VyL2ZpbmRDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBR2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sb0JBQW9CLEVBR3BCLG1CQUFtQixFQUNuQiw0QkFBNEIsRUFDNUIsZUFBZSxFQUNmLHNCQUFzQixFQUN0Qiw0QkFBNEIsR0FDNUIsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFB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