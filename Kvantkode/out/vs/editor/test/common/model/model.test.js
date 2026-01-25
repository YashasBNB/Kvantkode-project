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
import { Disposable, DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditOperation } from '../../../common/core/editOperation.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { NullState } from '../../../common/languages/nullTokenize.js';
import { InternalModelContentChangeEvent, ModelRawContentChangedEvent, ModelRawFlush, ModelRawLineChanged, ModelRawLinesDeleted, ModelRawLinesInserted, } from '../../../common/textModelEvents.js';
import { createModelServices, createTextModel, instantiateTextModel } from '../testTextModel.js';
// --------- utils
const LINE1 = 'My First Line';
const LINE2 = '\t\tMy Second Line';
const LINE3 = '    Third Line';
const LINE4 = '';
const LINE5 = '1';
suite('Editor Model - Model', () => {
    let thisModel;
    setup(() => {
        const text = LINE1 + '\r\n' + LINE2 + '\n' + LINE3 + '\n' + LINE4 + '\r\n' + LINE5;
        thisModel = createTextModel(text);
    });
    teardown(() => {
        thisModel.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    // --------- insert text
    test('model getValue', () => {
        assert.strictEqual(thisModel.getValue(), 'My First Line\n\t\tMy Second Line\n    Third Line\n\n1');
    });
    test('model insert empty text', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), '')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My First Line');
    });
    test('model insert text without newline 1', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'foo ')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'foo My First Line');
    });
    test('model insert text without newline 2', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' foo')]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My foo First Line');
    });
    test('model insert text with one newline', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' new line\nNo longer')]);
        assert.strictEqual(thisModel.getLineCount(), 6);
        assert.strictEqual(thisModel.getLineContent(1), 'My new line');
        assert.strictEqual(thisModel.getLineContent(2), 'No longer First Line');
    });
    test('model insert text with two newlines', () => {
        thisModel.applyEdits([
            EditOperation.insert(new Position(1, 3), ' new line\nOne more line in the middle\nNo longer'),
        ]);
        assert.strictEqual(thisModel.getLineCount(), 7);
        assert.strictEqual(thisModel.getLineContent(1), 'My new line');
        assert.strictEqual(thisModel.getLineContent(2), 'One more line in the middle');
        assert.strictEqual(thisModel.getLineContent(3), 'No longer First Line');
    });
    test('model insert text with many newlines', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), '\n\n\n\n')]);
        assert.strictEqual(thisModel.getLineCount(), 9);
        assert.strictEqual(thisModel.getLineContent(1), 'My');
        assert.strictEqual(thisModel.getLineContent(2), '');
        assert.strictEqual(thisModel.getLineContent(3), '');
        assert.strictEqual(thisModel.getLineContent(4), '');
        assert.strictEqual(thisModel.getLineContent(5), ' First Line');
    });
    // --------- insert text eventing
    test('model insert empty text does not trigger eventing', () => {
        const disposable = thisModel.onDidChangeContentOrInjectedText((e) => {
            assert.ok(false, 'was not expecting event');
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), '')]);
        disposable.dispose();
    });
    test('model insert text without newline eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'foo ')]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawLineChanged(1, 'foo My First Line', null)], 2, false, false));
        disposable.dispose();
    });
    test('model insert text with one newline eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.insert(new Position(1, 3), ' new line\nNo longer')]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([
            new ModelRawLineChanged(1, 'My new line', null),
            new ModelRawLinesInserted(2, 2, ['No longer First Line'], [null]),
        ], 2, false, false));
        disposable.dispose();
    });
    // --------- delete text
    test('model delete empty text', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 1))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'My First Line');
    });
    test('model delete text from one line', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 2))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'y First Line');
    });
    test('model delete text from one line 2', () => {
        thisModel.applyEdits([EditOperation.insert(new Position(1, 1), 'a')]);
        assert.strictEqual(thisModel.getLineContent(1), 'aMy First Line');
        thisModel.applyEdits([EditOperation.delete(new Range(1, 2, 1, 4))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), 'a First Line');
    });
    test('model delete all text from a line', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 14))]);
        assert.strictEqual(thisModel.getLineCount(), 5);
        assert.strictEqual(thisModel.getLineContent(1), '');
    });
    test('model delete text from two lines', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 2, 6))]);
        assert.strictEqual(thisModel.getLineCount(), 4);
        assert.strictEqual(thisModel.getLineContent(1), 'My Second Line');
    });
    test('model delete text from many lines', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 3, 5))]);
        assert.strictEqual(thisModel.getLineCount(), 3);
        assert.strictEqual(thisModel.getLineContent(1), 'My Third Line');
    });
    test('model delete everything', () => {
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 5, 2))]);
        assert.strictEqual(thisModel.getLineCount(), 1);
        assert.strictEqual(thisModel.getLineContent(1), '');
    });
    // --------- delete text eventing
    test('model delete empty text does not trigger eventing', () => {
        const disposable = thisModel.onDidChangeContentOrInjectedText((e) => {
            assert.ok(false, 'was not expecting event');
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 1))]);
        disposable.dispose();
    });
    test('model delete text from one line eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 2))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawLineChanged(1, 'y First Line', null)], 2, false, false));
        disposable.dispose();
    });
    test('model delete all text from a line eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 1, 1, 14))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawLineChanged(1, '', null)], 2, false, false));
        disposable.dispose();
    });
    test('model delete text from two lines eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 2, 6))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawLineChanged(1, 'My Second Line', null), new ModelRawLinesDeleted(2, 2)], 2, false, false));
        disposable.dispose();
    });
    test('model delete text from many lines eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.applyEdits([EditOperation.delete(new Range(1, 4, 3, 5))]);
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawLineChanged(1, 'My Third Line', null), new ModelRawLinesDeleted(2, 3)], 2, false, false));
        disposable.dispose();
    });
    // --------- getValueInRange
    test('getValueInRange', () => {
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 1)), '');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 2)), 'M');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 2, 1, 3)), 'y');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 1, 14)), 'My First Line');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 1)), 'My First Line\n');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 2)), 'My First Line\n\t');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 3)), 'My First Line\n\t\t');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 2, 17)), 'My First Line\n\t\tMy Second Line');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 3, 1)), 'My First Line\n\t\tMy Second Line\n');
        assert.strictEqual(thisModel.getValueInRange(new Range(1, 1, 4, 1)), 'My First Line\n\t\tMy Second Line\n    Third Line\n');
    });
    // --------- getValueLengthInRange
    test('getValueLengthInRange', () => {
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 1)), ''.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 2)), 'M'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 2, 1, 3)), 'y'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 1, 14)), 'My First Line'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 1)), 'My First Line\n'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 2)), 'My First Line\n\t'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 3)), 'My First Line\n\t\t'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 2, 17)), 'My First Line\n\t\tMy Second Line'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 3, 1)), 'My First Line\n\t\tMy Second Line\n'.length);
        assert.strictEqual(thisModel.getValueLengthInRange(new Range(1, 1, 4, 1)), 'My First Line\n\t\tMy Second Line\n    Third Line\n'.length);
    });
    // --------- setValue
    test('setValue eventing', () => {
        let e = null;
        const disposable = thisModel.onDidChangeContentOrInjectedText((_e) => {
            if (e !== null || !(_e instanceof InternalModelContentChangeEvent)) {
                assert.fail('Unexpected assertion error');
            }
            e = _e.rawContentChangedEvent;
        });
        thisModel.setValue('new value');
        assert.deepStrictEqual(e, new ModelRawContentChangedEvent([new ModelRawFlush()], 2, false, false));
        disposable.dispose();
    });
    test('issue #46342: Maintain edit operation order in applyEdits', () => {
        const res = thisModel.applyEdits([
            { range: new Range(2, 1, 2, 1), text: 'a' },
            { range: new Range(1, 1, 1, 1), text: 'b' },
        ], true);
        assert.deepStrictEqual(res[0].range, new Range(2, 1, 2, 2));
        assert.deepStrictEqual(res[1].range, new Range(1, 1, 1, 2));
    });
});
// --------- Special Unicode LINE SEPARATOR character
suite('Editor Model - Model Line Separators', () => {
    let thisModel;
    setup(() => {
        const text = LINE1 + '\u2028' + LINE2 + '\n' + LINE3 + '\u2028' + LINE4 + '\r\n' + LINE5;
        thisModel = createTextModel(text);
    });
    teardown(() => {
        thisModel.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('model getValue', () => {
        assert.strictEqual(thisModel.getValue(), 'My First Line\u2028\t\tMy Second Line\n    Third Line\u2028\n1');
    });
    test('model lines', () => {
        assert.strictEqual(thisModel.getLineCount(), 3);
    });
    test('Bug 13333:Model should line break on lonely CR too', () => {
        const model = createTextModel('Hello\rWorld!\r\nAnother line');
        assert.strictEqual(model.getLineCount(), 3);
        assert.strictEqual(model.getValue(), 'Hello\r\nWorld!\r\nAnother line');
        model.dispose();
    });
});
// --------- Words
suite('Editor Model - Words', () => {
    const OUTER_LANGUAGE_ID = 'outerMode';
    const INNER_LANGUAGE_ID = 'innerMode';
    let OuterMode = class OuterMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = OUTER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
            const languageIdCodec = languageService.languageIdCodec;
            this._register(TokenizationRegistry.register(this.languageId, {
                getInitialState: () => NullState,
                tokenize: undefined,
                tokenizeEncoded: (line, hasEOL, state) => {
                    const tokensArr = [];
                    let prevLanguageId = undefined;
                    for (let i = 0; i < line.length; i++) {
                        const languageId = line.charAt(i) === 'x' ? INNER_LANGUAGE_ID : OUTER_LANGUAGE_ID;
                        const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
                        if (prevLanguageId !== languageId) {
                            tokensArr.push(i);
                            tokensArr.push(encodedLanguageId << 0 /* MetadataConsts.LANGUAGEID_OFFSET */);
                        }
                        prevLanguageId = languageId;
                    }
                    const tokens = new Uint32Array(tokensArr.length);
                    for (let i = 0; i < tokens.length; i++) {
                        tokens[i] = tokensArr[i];
                    }
                    return new EncodedTokenizationResult(tokens, state);
                },
            }));
        }
    };
    OuterMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], OuterMode);
    let InnerMode = class InnerMode extends Disposable {
        constructor(languageService, languageConfigurationService) {
            super();
            this.languageId = INNER_LANGUAGE_ID;
            this._register(languageService.registerLanguage({ id: this.languageId }));
            this._register(languageConfigurationService.register(this.languageId, {}));
        }
    };
    InnerMode = __decorate([
        __param(0, ILanguageService),
        __param(1, ILanguageConfigurationService)
    ], InnerMode);
    let disposables = [];
    setup(() => {
        disposables = [];
    });
    teardown(() => {
        dispose(disposables);
        disposables = [];
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Get word at position', () => {
        const text = ['This text has some  words. '];
        const thisModel = createTextModel(text.join('\n'));
        disposables.push(thisModel);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 1)), {
            word: 'This',
            startColumn: 1,
            endColumn: 5,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 2)), {
            word: 'This',
            startColumn: 1,
            endColumn: 5,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 4)), {
            word: 'This',
            startColumn: 1,
            endColumn: 5,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 5)), {
            word: 'This',
            startColumn: 1,
            endColumn: 5,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 6)), {
            word: 'text',
            startColumn: 6,
            endColumn: 10,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 19)), {
            word: 'some',
            startColumn: 15,
            endColumn: 19,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 20)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 21)), {
            word: 'words',
            startColumn: 21,
            endColumn: 26,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 26)), {
            word: 'words',
            startColumn: 21,
            endColumn: 26,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 27)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 28)), null);
    });
    test('getWordAtPosition at embedded language boundaries', () => {
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const outerMode = disposables.add(instantiationService.createInstance(OuterMode));
        disposables.add(instantiationService.createInstance(InnerMode));
        const model = disposables.add(instantiateTextModel(instantiationService, 'ab<xx>ab<x>', outerMode.languageId));
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 1)), {
            word: 'ab',
            startColumn: 1,
            endColumn: 3,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 2)), {
            word: 'ab',
            startColumn: 1,
            endColumn: 3,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 3)), {
            word: 'ab',
            startColumn: 1,
            endColumn: 3,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 4)), {
            word: 'xx',
            startColumn: 4,
            endColumn: 6,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 5)), {
            word: 'xx',
            startColumn: 4,
            endColumn: 6,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 6)), {
            word: 'xx',
            startColumn: 4,
            endColumn: 6,
        });
        assert.deepStrictEqual(model.getWordAtPosition(new Position(1, 7)), {
            word: 'ab',
            startColumn: 7,
            endColumn: 9,
        });
        disposables.dispose();
    });
    test('issue #61296: VS code freezes when editing CSS file with emoji', () => {
        const MODE_ID = 'testMode';
        const disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: MODE_ID }));
        disposables.add(languageConfigurationService.register(MODE_ID, {
            wordPattern: /(#?-?\d*\.\d\w*%?)|(::?[\w-]*(?=[^,{;]*[,{]))|(([@#.!])?[\w-?]+%?|[@#!.])/g,
        }));
        const thisModel = disposables.add(instantiateTextModel(instantiationService, '.🐷-a-b', MODE_ID));
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 1)), {
            word: '.',
            startColumn: 1,
            endColumn: 2,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 2)), {
            word: '.',
            startColumn: 1,
            endColumn: 2,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 3)), null);
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 4)), {
            word: '-a-b',
            startColumn: 4,
            endColumn: 8,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 5)), {
            word: '-a-b',
            startColumn: 4,
            endColumn: 8,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 6)), {
            word: '-a-b',
            startColumn: 4,
            endColumn: 8,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 7)), {
            word: '-a-b',
            startColumn: 4,
            endColumn: 8,
        });
        assert.deepStrictEqual(thisModel.getWordAtPosition(new Position(1, 8)), {
            word: '-a-b',
            startColumn: 4,
            endColumn: 8,
        });
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVsL21vZGVsLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFDTix5QkFBeUIsRUFFekIsb0JBQW9CLEdBQ3BCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXJFLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsMkJBQTJCLEVBQzNCLGFBQWEsRUFDYixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLHFCQUFxQixHQUNyQixNQUFNLG9DQUFvQyxDQUFBO0FBQzNDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxlQUFlLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVoRyxrQkFBa0I7QUFFbEIsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFBO0FBQzdCLE1BQU0sS0FBSyxH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QUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNsQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0RixNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDdkQsZUFBZSxDQUFDLE1BQU0sQ0FDdEIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUN0RCxpQkFBaUIsQ0FBQyxNQUFNLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDdEQsbUJBQW1CLENBQUMsTUFBTSxDQUMxQixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQ3RELHFCQUFxQixDQUFDLE1BQU0sQ0FDNUIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUN2RCxtQ0FBbUMsQ0FBQyxNQUFNLENBQzFDLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixTQUFTLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFDdEQscUNBQXFDLENBQUMsTUFBTSxDQUM1QyxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsU0FBUyxDQUFDLHFCQUFxQixDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQ3RELHFEQUFxRCxDQUFDLE1BQU0sQ0FDNUQsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYscUJBQXFCO0lBQ3JCLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7UUFDOUIsSUFBSSxDQUFDLEdBQXVDLElBQUksQ0FBQTtRQUNoRCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTtZQUNwRSxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsWUFBWSwrQkFBK0IsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLE1BQU0sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtZQUMxQyxDQUFDO1lBQ0QsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQTtRQUM5QixDQUFDLENBQUMsQ0FBQTtRQUNGLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0IsTUFBTSxDQUFDLGVBQWUsQ0FDckIsQ0FBQyxFQUNELElBQUksMkJBQTJCLENBQUMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FDdkUsQ0FBQTtRQUNELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNyQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7UUFDdEUsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FDL0I7WUFDQyxFQUFFLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO1lBQzNDLEVBQUUsS0FBSyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUU7U0FDM0MsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUVELE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFRixxREFBcUQ7QUFDckQsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUNsRCxJQUFJLFNBQW9CLENBQUE7SUFFeEIsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNW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O1lBQ3ZFLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLENBQUM7WUFDZCxTQUFTLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZFLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLENBQUM7WUFDZCxTQUFTLEVBQUUsQ0FBQztTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZFLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLENBQUM7WUFDZCxTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hFLElBQUksRUFBRSxNQUFNO1lBQ1osV0FBVyxFQUFFLEVBQUU7WUFDZixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hFLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLEVBQUU7WUFDZixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO1lBQ3hFLElBQUksRUFBRSxPQUFPO1lBQ2IsV0FBVyxFQUFFLEVBQUU7WUFDZixTQUFTLEVBQUUsRUFBRTtTQUNiLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlFLE1BQU0sQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEdBQUcsRUFBRTtRQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtRQUNqRixXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQzVCLG9CQUFvQixDQUFDLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQy9FLENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLEVBQUUsSUFBSTtZQUNWLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFFRixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQzNFLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQTtRQUMxQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0QsTUFBTSw0QkFBNEIsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUM1RixNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUVsRSxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEUsV0FBVyxDQUFDLEdBQUcsQ0FDZCw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQzlDLFdBQVcsRUFBRSw0RUFBNEU7U0FDekYsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNoQyxvQkFBb0IsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQzlELENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsR0FBRztZQUNULFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsR0FBRztZQUNULFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN2RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFdBQVcsRUFBRSxDQUFDO1lBQ2QsU0FBUyxFQUFFLENBQUM7U0FDWixDQUFDLENBQUE7UUFFRixXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9