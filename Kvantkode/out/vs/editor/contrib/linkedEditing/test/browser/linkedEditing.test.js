/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CoreEditingCommands } from '../../../../browser/coreCommands.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { USUAL_WORD_SEPARATORS } from '../../../../common/core/wordHelper.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { DeleteAllLeftAction } from '../../../linesOperations/browser/linesOperations.js';
import { LinkedEditingContribution } from '../../browser/linkedEditing.js';
import { DeleteWordLeft } from '../../../wordOperations/browser/wordOperations.js';
import { createCodeEditorServices, instantiateTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
const mockFile = URI.parse('test:somefile.ttt');
const mockFileSelector = { scheme: 'test' };
const timeout = 30;
const languageId = 'linkedEditingTestLangage';
suite('linked editing', () => {
    let disposables;
    let instantiationService;
    let languageFeaturesService;
    let languageConfigurationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createCodeEditorServices(disposables);
        languageFeaturesService = instantiationService.get(ILanguageFeaturesService);
        languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        disposables.add(languageConfigurationService.register(languageId, {
            wordPattern: /[a-zA-Z]+/,
        }));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createMockEditor(text) {
        const model = disposables.add(instantiateTextModel(instantiationService, typeof text === 'string' ? text : text.join('\n'), languageId, undefined, mockFile));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
        return editor;
    }
    function testCase(name, initialState, operations, expectedEndText) {
        test(name, async () => {
            await runWithFakedTimers({}, async () => {
                disposables.add(languageFeaturesService.linkedEditingRangeProvider.register(mockFileSelector, {
                    provideLinkedEditingRanges(model, pos) {
                        const wordAtPos = model.getWordAtPosition(pos);
                        if (wordAtPos) {
                            const matches = model.findMatches(wordAtPos.word, false, false, true, USUAL_WORD_SEPARATORS, false);
                            return {
                                ranges: matches.map((m) => m.range),
                                wordPattern: initialState.responseWordPattern,
                            };
                        }
                        return { ranges: [], wordPattern: initialState.responseWordPattern };
                    },
                }));
                const editor = createMockEditor(initialState.text);
                editor.updateOptions({ linkedEditing: true });
                const linkedEditingContribution = disposables.add(editor.registerAndInstantiateContribution(LinkedEditingContribution.ID, LinkedEditingContribution));
                linkedEditingContribution.setDebounceDuration(0);
                const testEditor = {
                    setPosition(pos) {
                        editor.setPosition(pos);
                        return linkedEditingContribution.currentUpdateTriggerPromise;
                    },
                    setSelection(sel) {
                        editor.setSelection(sel);
                        return linkedEditingContribution.currentUpdateTriggerPromise;
                    },
                    trigger(source, handlerId, payload) {
                        if (handlerId === "type" /* Handler.Type */ || handlerId === "paste" /* Handler.Paste */) {
                            editor.trigger(source, handlerId, payload);
                        }
                        else if (handlerId === 'deleteLeft') {
                            CoreEditingCommands.DeleteLeft.runEditorCommand(null, editor, payload);
                        }
                        else if (handlerId === 'deleteWordLeft') {
                            instantiationService.invokeFunction((accessor) => new DeleteWordLeft().runEditorCommand(accessor, editor, payload));
                        }
                        else if (handlerId === 'deleteAllLeft') {
                            instantiationService.invokeFunction((accessor) => new DeleteAllLeftAction().runEditorCommand(accessor, editor, payload));
                        }
                        else {
                            throw new Error(`Unknown handler ${handlerId}!`);
                        }
                        return linkedEditingContribution.currentSyncTriggerPromise;
                    },
                    undo() {
                        CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
                    },
                    redo() {
                        CoreEditingCommands.Redo.runEditorCommand(null, editor, null);
                    },
                };
                await operations(testEditor);
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (typeof expectedEndText === 'string') {
                            assert.strictEqual(editor.getModel().getValue(), expectedEndText);
                        }
                        else {
                            assert.strictEqual(editor.getModel().getValue(), expectedEndText.join('\n'));
                        }
                        resolve();
                    }, timeout);
                });
            });
        });
    }
    const state = {
        text: '<ooo></ooo>',
    };
    /**
     * Simple insertion
     */
    testCase('Simple insert - initial', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Simple insert - middle', state, async (editor) => {
        const pos = new Position(1, 3);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oioo></oioo>');
    testCase('Simple insert - end', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oooi></oooi>');
    /**
     * Simple insertion - end
     */
    testCase('Simple insert end - initial', state, async (editor) => {
        const pos = new Position(1, 8);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Simple insert end - middle', state, async (editor) => {
        const pos = new Position(1, 9);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oioo></oioo>');
    testCase('Simple insert end - end', state, async (editor) => {
        const pos = new Position(1, 11);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<oooi></oooi>');
    /**
     * Boundary insertion
     */
    testCase('Simple insert - out of boundary', state, async (editor) => {
        const pos = new Position(1, 1);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, 'i<ooo></ooo>');
    testCase('Simple insert - out of boundary 2', state, async (editor) => {
        const pos = new Position(1, 6);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo>i</ooo>');
    testCase('Simple insert - out of boundary 3', state, async (editor) => {
        const pos = new Position(1, 7);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo><i/ooo>');
    testCase('Simple insert - out of boundary 4', state, async (editor) => {
        const pos = new Position(1, 12);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ooo></ooo>i');
    /**
     * Insert + Move
     */
    testCase('Continuous insert', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iiooo></iiooo>');
    testCase('Insert - move - insert', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.setPosition(new Position(1, 4));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ioioo></ioioo>');
    testCase('Insert - move - insert outside region', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        await editor.setPosition(new Position(1, 7));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo>i</iooo>');
    /**
     * Selection insert
     */
    testCase('Selection insert - simple', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 3));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<ioo></ioo>');
    testCase('Selection insert - whole', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 5));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<i></i>');
    testCase('Selection insert - across boundary', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 1, 1, 3));
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, 'ioo></oo>');
    /**
     * @todo
     * Undefined behavior
     */
    // testCase('Selection insert - across two boundary', state, async (editor) => {
    // 	const pos = new Position(1, 2);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.setSelection(new Range(1, 4, 1, 9));
    // 	await editor.trigger('keyboard', Handler.Type, { text: 'i' });
    // }, '<ooioo>');
    /**
     * Break out behavior
     */
    testCase('Breakout - type space', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
    }, '<ooo ></ooo>');
    testCase('Breakout - type space then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Breakout - type space in middle', state, async (editor) => {
        const pos = new Position(1, 4);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: ' ' });
    }, '<oo o></ooo>');
    testCase('Breakout - paste content starting with space', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i="i"' });
    }, '<ooo i="i"></ooo>');
    testCase('Breakout - paste content starting with space then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i="i"' });
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Breakout - paste content starting with space in middle', state, async (editor) => {
        const pos = new Position(1, 4);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: ' i' });
    }, '<oo io></ooo>');
    /**
     * Break out with custom provider wordPattern
     */
    const state3 = {
        ...state,
        responseWordPattern: /[a-yA-Y]+/,
    };
    testCase('Breakout with stop pattern - insert', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></iooo>');
    testCase('Breakout with stop pattern - insert stop char', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'z' });
    }, '<zooo></ooo>');
    testCase('Breakout with stop pattern - paste char', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: 'z' });
    }, '<zooo></ooo>');
    testCase('Breakout with stop pattern - paste string', state3, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "paste" /* Handler.Paste */, { text: 'zo' });
    }, '<zoooo></ooo>');
    testCase('Breakout with stop pattern - insert at end', state3, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'z' });
    }, '<oooz></ooo>');
    const state4 = {
        ...state,
        responseWordPattern: /[a-eA-E]+/,
    };
    testCase('Breakout with stop pattern - insert stop char, respos', state4, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, '<iooo></ooo>');
    /**
     * Delete
     */
    testCase('Delete - left char', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, '<oo></oo>');
    testCase('Delete - left char then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteLeft', {});
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Delete - left word', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteWordLeft', {});
    }, '<></>');
    testCase('Delete - left word then undo', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteWordLeft', {});
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    /**
     * Todo: Fix test
     */
    // testCase('Delete - left all', state, async (editor) => {
    // 	const pos = new Position(1, 3);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.trigger('keyboard', 'deleteAllLeft', {});
    // }, '></>');
    /**
     * Todo: Fix test
     */
    // testCase('Delete - left all then undo', state, async (editor) => {
    // 	const pos = new Position(1, 5);
    // 	await editor.setPosition(pos);
    // 	await linkedEditingContribution.updateLinkedUI(pos);
    // 	await editor.trigger('keyboard', 'deleteAllLeft', {});
    // 	editor.undo();
    // }, '></ooo>');
    testCase('Delete - left all then undo twice', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', 'deleteAllLeft', {});
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Delete - selection', state, async (editor) => {
        const pos = new Position(1, 5);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 2, 1, 3));
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, '<oo></oo>');
    testCase('Delete - selection across boundary', state, async (editor) => {
        const pos = new Position(1, 3);
        await editor.setPosition(pos);
        await editor.setSelection(new Range(1, 1, 1, 3));
        await editor.trigger('keyboard', 'deleteLeft', {});
    }, 'oo></oo>');
    /**
     * Undo / redo
     */
    testCase('Undo/redo - simple undo', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        editor.undo();
        editor.undo();
    }, '<ooo></ooo>');
    testCase('Undo/redo - simple undo/redo', state, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
        editor.undo();
        editor.redo();
    }, '<iooo></iooo>');
    /**
     * Multi line
     */
    const state2 = {
        text: ['<ooo>', '</ooo>'],
    };
    testCase('Multiline insert', state2, async (editor) => {
        const pos = new Position(1, 2);
        await editor.setPosition(pos);
        await editor.trigger('keyboard', "type" /* Handler.Type */, { text: 'i' });
    }, ['<iooo>', '</iooo>']);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9saW5rZWRFZGl0aW5nL3Rlc3QvYnJvd3Nlci9saW5rZWRFZGl0aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDM0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUU3RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUVOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FDekIsTUFBTSw0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