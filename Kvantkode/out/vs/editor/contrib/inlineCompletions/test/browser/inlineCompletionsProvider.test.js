/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { InlineCompletionsController } from '../../browser/controller/inlineCompletionsController.js';
import { SingleTextEdit } from '../../../../common/core/textEdit.js';
import { GhostTextContext, MockInlineCompletionsProvider } from './utils.js';
import { withAsyncTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { Selection } from '../../../../common/core/selection.js';
import { computeGhostText } from '../../browser/model/computeGhostText.js';
suite('Inline Completions', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('inlineCompletionToGhostText', () => {
        function getOutput(text, suggestion) {
            const rangeStartOffset = text.indexOf('[');
            const rangeEndOffset = text.indexOf(']') - 1;
            const cleanedText = text.replace('[', '').replace(']', '');
            const tempModel = createTextModel(cleanedText);
            const range = Range.fromPositions(tempModel.getPositionAt(rangeStartOffset), tempModel.getPositionAt(rangeEndOffset));
            const options = ['prefix', 'subword'];
            const result = {};
            for (const option of options) {
                result[option] = computeGhostText(new SingleTextEdit(range, suggestion), tempModel, option)?.render(cleanedText, true);
            }
            tempModel.dispose();
            if (new Set(Object.values(result)).size === 1) {
                return Object.values(result)[0];
            }
            return result;
        }
        test('Basic', () => {
            assert.deepStrictEqual(getOutput('[foo]baz', 'foobar'), 'foo[bar]baz');
            assert.deepStrictEqual(getOutput('[aaa]aaa', 'aaaaaa'), 'aaa[aaa]aaa');
            assert.deepStrictEqual(getOutput('[foo]baz', 'boobar'), undefined);
            assert.deepStrictEqual(getOutput('[foo]foo', 'foofoo'), 'foo[foo]foo');
            assert.deepStrictEqual(getOutput('foo[]', 'bar\nhello'), 'foo[bar\nhello]');
        });
        test('Empty ghost text', () => {
            assert.deepStrictEqual(getOutput('[foo]', 'foo'), 'foo');
        });
        test('Whitespace (indentation)', () => {
            assert.deepStrictEqual(getOutput('[ foo]', 'foobar'), ' foo[bar]');
            assert.deepStrictEqual(getOutput('[\tfoo]', 'foobar'), '\tfoo[bar]');
            assert.deepStrictEqual(getOutput('[\t foo]', '\tfoobar'), '	 foo[bar]');
            assert.deepStrictEqual(getOutput('[\tfoo]', '\t\tfoobar'), {
                prefix: undefined,
                subword: '\t[\t]foo[bar]',
            });
            assert.deepStrictEqual(getOutput('[\t]', '\t\tfoobar'), '\t[\tfoobar]');
            assert.deepStrictEqual(getOutput('\t[]', '\t'), '\t[\t]');
            assert.deepStrictEqual(getOutput('\t[\t]', ''), '\t\t');
            assert.deepStrictEqual(getOutput('[ ]', 'return 1'), ' [return 1]');
        });
        test('Whitespace (outside of indentation)', () => {
            assert.deepStrictEqual(getOutput('bar[ foo]', 'foobar'), undefined);
            assert.deepStrictEqual(getOutput('bar[\tfoo]', 'foobar'), undefined);
        });
        test('Unsupported Case', () => {
            assert.deepStrictEqual(getOutput('fo[o\n]', 'x\nbar'), undefined);
        });
        test('New Line', () => {
            assert.deepStrictEqual(getOutput('fo[o\n]', 'o\nbar'), 'foo\n[bar]');
        });
        test('Multi Part Diffing', () => {
            assert.deepStrictEqual(getOutput('foo[()]', '(x);'), {
                prefix: undefined,
                subword: 'foo([x])[;]',
            });
            assert.deepStrictEqual(getOutput('[\tfoo]', '\t\tfoobar'), {
                prefix: undefined,
                subword: '\t[\t]foo[bar]',
            });
            assert.deepStrictEqual(getOutput('[(y ===)]', '(y === 1) { f(); }'), {
                prefix: undefined,
                subword: '(y ===[ 1])[ { f(); }]',
            });
            assert.deepStrictEqual(getOutput('[(y ==)]', '(y === 1) { f(); }'), {
                prefix: undefined,
                subword: '(y ==[= 1])[ { f(); }]',
            });
            assert.deepStrictEqual(getOutput('[(y ==)]', '(y === 1) { f(); }'), {
                prefix: undefined,
                subword: '(y ==[= 1])[ { f(); }]',
            });
        });
        test('Multi Part Diffing 1', () => {
            assert.deepStrictEqual(getOutput('[if () ()]', 'if (1 == f()) ()'), {
                prefix: undefined,
                subword: 'if ([1 == f()]) ()',
            });
        });
        test('Multi Part Diffing 2', () => {
            assert.deepStrictEqual(getOutput('[)]', '())'), { prefix: undefined, subword: '[(])[)]' });
            assert.deepStrictEqual(getOutput('[))]', '(())'), { prefix: undefined, subword: '[((]))' });
        });
        test('Parenthesis Matching', () => {
            assert.deepStrictEqual(getOutput('[console.log()]', 'console.log({ label: "(" })'), {
                prefix: undefined,
                subword: 'console.log([{ label: "(" }])',
            });
        });
    });
    test('Does not trigger automatically if disabled', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: false } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            await timeout(1000);
            // Provider is not called, no ghost text is shown.
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['']);
        });
    });
    test('Ghost text is shown after trigger', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
        });
    });
    test('Ghost text is shown automatically when configured', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
        });
    });
    test('Ghost text is updated automatically', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.triggerExplicitly();
            await timeout(1000);
            provider.setReturnValue({ insertText: 'foobizz', range: new Range(1, 1, 1, 6) });
            context.keyboardType('b');
            context.keyboardType('i');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1 },
                { position: '(1,6)', text: 'foobi', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                '',
                'foo[bar]',
                'foob[ar]',
                'foobi',
                'foobi[zz]',
            ]);
        });
    });
    test('Unindent whitespace', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('  ');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 2, 1, 3) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', '  [foo]']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,3)', text: '  ', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [' foo']);
        });
    });
    test('Unindent tab', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('\t\t');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 2, 1, 3) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', '\t\t[foo]']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,3)', text: '\t\t', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['\tfoo']);
        });
    });
    test('No unindent after indentation', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('buzz  ');
            provider.setReturnValue({ insertText: 'foo', range: new Range(1, 6, 1, 7) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['']);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,7)', text: 'buzz  ', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), []);
        });
    });
    test('Next/previous', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar1', range: new Range(1, 1, 1, 4) });
            model.trigger();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar1]']);
            provider.setReturnValues([
                { insertText: 'foobar1', range: new Range(1, 1, 1, 4) },
                { insertText: 'foobizz2', range: new Range(1, 1, 1, 4) },
                { insertText: 'foobuzz3', range: new Range(1, 1, 1, 4) },
            ]);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bizz2]']);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[buzz3]']);
            model.next();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bar1]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[buzz3]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bizz2]']);
            model.previous();
            await timeout(1000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foo[bar1]']);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0 },
                { position: '(1,4)', text: 'foo', triggerKind: 1 },
            ]);
        });
    });
    test('Calling the provider is debounced', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            model.trigger();
            context.keyboardType('f');
            await timeout(40);
            context.keyboardType('o');
            await timeout(40);
            context.keyboardType('o');
            await timeout(40);
            // The provider is not called
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            await timeout(400);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0 },
            ]);
            provider.assertNotCalledTwiceWithin50ms();
        });
    });
    test('Backspace is debounced', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('foo');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            await timeout(1000);
            for (let j = 0; j < 2; j++) {
                for (let i = 0; i < 3; i++) {
                    context.leftDelete();
                    await timeout(5);
                }
                context.keyboardType('bar');
            }
            await timeout(400);
            provider.assertNotCalledTwiceWithin50ms();
        });
    });
    test('Forward stability', async function () {
        // The user types the text as suggested and the provider is forward-stable
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.trigger();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 5) });
            context.keyboardType('b');
            assert.deepStrictEqual(context.currentPrettyViewState, 'foob[ar]');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foob[ar]']);
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 6) });
            context.keyboardType('a');
            assert.deepStrictEqual(context.currentPrettyViewState, 'fooba[r]');
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,6)', text: 'fooba', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['fooba[r]']);
        });
    });
    test('Support forward instability', async function () {
        // The user types the text as suggested and the provider reports a different suggestion.
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 4) });
            context.keyboardType('foo');
            model.triggerExplicitly();
            await timeout(100);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,4)', text: 'foo', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'foo[bar]']);
            provider.setReturnValue({ insertText: 'foobaz', range: new Range(1, 1, 1, 5) });
            context.keyboardType('b');
            assert.deepStrictEqual(context.currentPrettyViewState, 'foob[ar]');
            await timeout(100);
            // This behavior might change!
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foob[ar]', 'foob[az]']);
        });
    });
    test('Support backward instability', async function () {
        // The user deletes text and the suggestion changes
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('fooba');
            provider.setReturnValue({ insertText: 'foobar', range: new Range(1, 1, 1, 6) });
            model.triggerExplicitly();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,6)', text: 'fooba', triggerKind: 1 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'fooba[r]']);
            provider.setReturnValue({ insertText: 'foobaz', range: new Range(1, 1, 1, 5) });
            context.leftDelete();
            await timeout(1000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(1,5)', text: 'foob', triggerKind: 0 },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['foob[ar]', 'foob[az]']);
        });
    });
    test('No race conditions', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('h');
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 2) }, 1000);
            model.triggerExplicitly();
            await timeout(1030);
            context.keyboardType('ello');
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 6) }, 1000);
            // after 20ms: Inline completion provider answers back
            // after 50ms: Debounce is triggered
            await timeout(2000);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'hello[world]']);
        });
    });
    test('Do not reuse cache from previous session (#132516)', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('hello\n');
            context.cursorLeft();
            context.keyboardType('x');
            context.leftDelete();
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(1, 1, 1, 6) }, 1000);
            await timeout(2000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                {
                    position: '(1,6)',
                    text: 'hello\n',
                    triggerKind: 0,
                },
            ]);
            provider.setReturnValue({ insertText: 'helloworld', range: new Range(2, 1, 2, 6) }, 1000);
            context.cursorDown();
            context.keyboardType('hello');
            await timeout(40);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), []);
            // Update ghost text
            context.keyboardType('w');
            context.leftDelete();
            await timeout(2000);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(2,6)', triggerKind: 0, text: 'hello\nhello' },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), [
                '',
                'hello[world]\n',
                'hello\n',
                'hello\nhello[world]',
            ]);
        });
    });
    test('Additional Text Edits', async function () {
        const provider = new MockInlineCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
            context.keyboardType('buzz\nbaz');
            provider.setReturnValue({
                insertText: 'bazz',
                range: new Range(2, 1, 2, 4),
                additionalTextEdits: [
                    {
                        range: new Range(1, 1, 1, 5),
                        text: 'bla',
                    },
                ],
            });
            model.triggerExplicitly();
            await timeout(1000);
            model.accept(editor);
            assert.deepStrictEqual(provider.getAndClearCallHistory(), [
                { position: '(2,4)', triggerKind: 1, text: 'buzz\nbaz' },
            ]);
            assert.deepStrictEqual(context.getAndClearViewStates(), ['', 'buzz\nbaz[z]', 'bla\nbazz']);
        });
    });
    suite('inlineCompletionMultiCursor', () => {
        test('Basic', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console\nconsole\n');
                editor.setSelections([new Selection(1, 1000, 1, 1000), new Selection(2, 1000, 2, 1000)]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [`console.log("hello");`, `console.log("hello");`, ``].join('\n'));
            });
        });
        test('Multi Part', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console.log()\nconsole.log\n');
                editor.setSelections([new Selection(1, 12, 1, 12), new Selection(2, 1000, 2, 1000)]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [`console.log("hello");`, `console.log("hello");`, ``].join('\n'));
            });
        });
        test('Multi Part and Different Cursor Columns', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('console.log()\nconsole.warn\n');
                editor.setSelections([new Selection(1, 12, 1, 12), new Selection(2, 14, 2, 14)]);
                provider.setReturnValue({
                    insertText: 'console.log("hello");',
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                model.accept(editor);
                assert.deepStrictEqual(editor.getValue(), [`console.log("hello");`, `console.warn("hello");`, ``].join('\n'));
            });
        });
        async function acceptNextWord(model, editor, timesToAccept = 1) {
            for (let i = 0; i < timesToAccept; i++) {
                model.triggerExplicitly();
                await timeout(1000);
                await model.acceptNextWord(editor);
            }
        }
        test('Basic Partial Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('let\nlet\n');
                editor.setSelections([new Selection(1, 1000, 1, 1000), new Selection(2, 1000, 2, 1000)]);
                provider.setReturnValue({
                    insertText: `let a = 'some word'; `,
                    range: new Range(1, 1, 1, 1000),
                });
                await acceptNextWord(model, editor, 2);
                assert.deepStrictEqual(editor.getValue(), [`let a`, `let a`, ``].join('\n'));
            });
        });
        test('Partial Multi-Part Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType('for ()\nfor \n');
                editor.setSelections([new Selection(1, 5, 1, 5), new Selection(2, 1000, 2, 1000)]);
                provider.setReturnValue({
                    insertText: `for (let i = 0; i < 10; i++) {`,
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                await acceptNextWord(model, editor, 3);
                assert.deepStrictEqual(editor.getValue(), [`for (let i)`, `for (let i`, ``].join('\n'));
            });
        });
        test('Partial Mutli-Part and Different Cursor Columns Completion', async function () {
            const provider = new MockInlineCompletionsProvider();
            await withAsyncTestCodeEditorAndInlineCompletionsModel('', { fakeClock: true, provider }, async ({ editor, editorViewModel, model, context }) => {
                context.keyboardType(`console.log()\nconsole.warnnnn\n`);
                editor.setSelections([new Selection(1, 12, 1, 12), new Selection(2, 16, 2, 16)]);
                provider.setReturnValue({
                    insertText: `console.log("hello" + " " + "world");`,
                    range: new Range(1, 1, 1, 1000),
                });
                model.triggerExplicitly();
                await timeout(1000);
                await acceptNextWord(model, editor, 4);
                assert.deepStrictEqual(editor.getValue(), [`console.log("hello" + )`, `console.warnnnn("hello" + `, ``].join('\n'));
            });
        });
    });
});
async function withAsyncTestCodeEditorAndInlineCompletionsModel(text, options, callback) {
    return await runWithFakedTimers({
        useFakeTimers: options.fakeClock,
    }, async () => {
        const disposableStore = new DisposableStore();
        try {
            if (options.provider) {
                const languageFeaturesService = new LanguageFeaturesService();
                if (!options.serviceCollection) {
                    options.serviceCollection = new ServiceCollection();
                }
                options.serviceCollection.set(ILanguageFeaturesService, languageFeaturesService);
                options.serviceCollection.set(IAccessibilitySignalService, {
                    playSignal: async () => { },
                    isSoundEnabled(signal) {
                        return false;
                    },
                });
                const d = languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, options.provider);
                disposableStore.add(d);
            }
            let result;
            await withAsyncTestCodeEditor(text, options, async (editor, editorViewModel, instantiationService) => {
                const controller = instantiationService.createInstance(InlineCompletionsController, editor);
                const model = controller.model.get();
                const context = new GhostTextContext(model, editor);
                try {
                    result = await callback({ editor, editorViewModel, model, context });
                }
                finally {
                    context.dispose();
                    model.dispose();
                    controller.dispose();
                }
            });
            if (options.provider instanceof MockInlineCompletionsProvider) {
                options.provider.assertNotCalledTwiceWithin50ms();
            }
            return result;
        }
        finally {
            disposableStore.dispose();
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNQcm92aWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmxpbmVDb21wbGV0aW9ucy90ZXN0L2Jyb3dzZXIvaW5saW5lQ29tcGxldGlvbnNQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzVFLE9BQU8sRUFHTix1QkFBdUIsR0FDdkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDL0gsT0FB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