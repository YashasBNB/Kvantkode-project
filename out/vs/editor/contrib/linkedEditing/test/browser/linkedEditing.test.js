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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua2VkRWRpdGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvbGlua2VkRWRpdGluZy90ZXN0L2Jyb3dzZXIvbGlua2VkRWRpdGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFN0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFN0csT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFFTix3QkFBd0IsRUFDeEIseUJBQXlCLEdBQ3pCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxF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