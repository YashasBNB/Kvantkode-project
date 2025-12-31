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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNQcm92aWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvdGVzdC9icm93c2VyL2lubGluZUNvbXBsZXRpb25zUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUM1RSxPQUFPLEVBR04sdUJBQXVCLEdBQ3ZCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG1GQUFtRixDQUFBO0FBQy9ILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFN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