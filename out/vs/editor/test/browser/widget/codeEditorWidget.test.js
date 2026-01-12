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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yV2lkZ2V0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXpELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDOUIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQ3hDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDaEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUV6QyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUE7WUFDbkIsV0FBVyxDQUFDLEdBQUcsQ0FDZCxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDeEMsT0FBTyxHQUFHLElBQUksQ0FBQTtZQUNmLENB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