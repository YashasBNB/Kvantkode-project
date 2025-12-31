/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { withTestCodeEditor } from '../testCodeEditor.js';
suite('CodeEditorWidget', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('onDidChangeModelDecorations', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelDecorations((e) => {
                invoked = true;
            }));
            viewModel.model.deltaDecorations([], [{ range: new Range(1, 1, 1, 1), options: { description: 'test' } }]);
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelLanguage', () => {
        withTestCodeEditor('', {}, (editor, viewModel, instantiationService) => {
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            let invoked = false;
            disposables.add(editor.onDidChangeModelLanguage((e) => {
                invoked = true;
            }));
            viewModel.model.setLanguage('testMode');
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelLanguageConfiguration', () => {
        withTestCodeEditor('', {}, (editor, viewModel, instantiationService) => {
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'testMode' }));
            viewModel.model.setLanguage('testMode');
            let invoked = false;
            disposables.add(editor.onDidChangeModelLanguageConfiguration((e) => {
                invoked = true;
            }));
            disposables.add(languageConfigurationService.register('testMode', {
                brackets: [['(', ')']],
            }));
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelContent', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelContent((e) => {
                invoked = true;
            }));
            viewModel.type('hello', 'test');
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('onDidChangeModelOptions', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let invoked = false;
            disposables.add(editor.onDidChangeModelOptions((e) => {
                invoked = true;
            }));
            viewModel.model.updateOptions({
                tabSize: 3,
            });
            assert.deepStrictEqual(invoked, true);
            disposables.dispose();
        });
    });
    test('issue #145872 - Model change events are emitted before the selection updates', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            let observedSelection = null;
            disposables.add(editor.onDidChangeModelContent((e) => {
                observedSelection = editor.getSelection();
            }));
            viewModel.type('hello', 'test');
            assert.deepStrictEqual(observedSelection, new Selection(1, 6, 1, 6));
            disposables.dispose();
        });
    });
    test('monaco-editor issue #2774 - Wrong order of events onDidChangeModelContent and onDidChangeCursorSelection on redo', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            viewModel.model.undo();
            viewModel.model.redo();
            assert.deepStrictEqual(calls, [
                'contentchange(a, 0, 0)',
                'cursorchange(1, 2)',
                'contentchange(, 0, 1)',
                'cursorchange(1, 1)',
                'contentchange(a, 0, 0)',
                'cursorchange(1, 2)',
            ]);
            disposables.dispose();
        });
    });
    test('issue #146174: Events delivered out of order when adding decorations in content change listener (1 of 2)', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener1 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener1 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener2 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener2 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            assert.deepStrictEqual(calls, [
                'listener1 - contentchange(a, 0, 0)',
                'listener2 - contentchange(a, 0, 0)',
                'listener1 - cursorchange(1, 2)',
                'listener2 - cursorchange(1, 2)',
            ]);
            disposables.dispose();
        });
    });
    test('issue #146174: Events delivered out of order when adding decorations in content change listener (2 of 2)', () => {
        withTestCodeEditor('', {}, (editor, viewModel) => {
            const disposables = new DisposableStore();
            const calls = [];
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener1 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
                editor.changeDecorations((changeAccessor) => {
                    changeAccessor.deltaDecorations([], [{ range: new Range(1, 1, 1, 1), options: { description: 'test' } }]);
                });
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener1 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            disposables.add(editor.onDidChangeModelContent((e) => {
                calls.push(`listener2 - contentchange(${e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []).join(', ')})`);
            }));
            disposables.add(editor.onDidChangeCursorSelection((e) => {
                calls.push(`listener2 - cursorchange(${e.selection.positionLineNumber}, ${e.selection.positionColumn})`);
            }));
            viewModel.type('a', 'test');
            assert.deepStrictEqual(calls, [
                'listener1 - contentchange(a, 0, 0)',
                'listener2 - contentchange(a, 0, 0)',
                'listener1 - cursorchange(1, 2)',
                'listener2 - cursorchange(1, 2)',
            ]);
            disposables.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci93aWRnZXQvY29kZUVkaXRvcldpZGdldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUV6RCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUN4QyxrQkFBa0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO1lBQ2hELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7WUFFekMsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFBO1lBQ25CLFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3hDLE9BQU8sR0FBRyxJQUFJLENBQUE7WUFDZixDQUFDLENB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