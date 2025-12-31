/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { DEFAULT_WORD_REGEXP } from '../../../../common/core/wordHelper.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { EditorWorker } from '../../../../common/services/editorWebWorker.js';
import { EditorWorkerService } from '../../../../browser/services/editorWorkerService.js';
import { CompletionItem } from '../../browser/suggest.js';
import { WordDistance } from '../../browser/wordDistance.js';
import { createCodeEditorServices, instantiateTestCodeEditor, } from '../../../../test/browser/testCodeEditor.js';
import { instantiateTextModel } from '../../../../test/common/testTextModel.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { LanguageFeaturesService } from '../../../../common/services/languageFeaturesService.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('suggest, word distance', function () {
    let distance;
    const disposables = new DisposableStore();
    setup(async function () {
        const languageId = 'bracketMode';
        disposables.clear();
        const instantiationService = createCodeEditorServices(disposables);
        const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languageConfigurationService.register(languageId, {
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')'],
            ],
        }));
        const model = disposables.add(instantiateTextModel(instantiationService, 'function abc(aa, ab){\na\n}', languageId, undefined, URI.parse('test:///some.path')));
        const editor = disposables.add(instantiateTestCodeEditor(instantiationService, model));
        editor.updateOptions({ suggest: { localityBonus: true } });
        editor.setPosition({ lineNumber: 2, column: 2 });
        const modelService = new (class extends mock() {
            constructor() {
                super(...arguments);
                this.onModelRemoved = Event.None;
            }
            getModel(uri) {
                return uri.toString() === model.uri.toString() ? model : null;
            }
        })();
        const service = new (class extends EditorWorkerService {
            constructor() {
                super(null, modelService, new (class extends mock() {
                })(), new NullLogService(), new TestLanguageConfigurationService(), new LanguageFeaturesService());
                this._worker = new EditorWorker();
                this._worker.$acceptNewModel({
                    url: model.uri.toString(),
                    lines: model.getLinesContent(),
                    EOL: model.getEOL(),
                    versionId: model.getVersionId(),
                });
                model.onDidChangeContent((e) => this._worker.$acceptModelChanged(model.uri.toString(), e));
            }
            computeWordRanges(resource, range) {
                return this._worker.$computeWordRanges(resource.toString(), range, DEFAULT_WORD_REGEXP.source, DEFAULT_WORD_REGEXP.flags);
            }
        })();
        distance = await WordDistance.create(service, editor);
        disposables.add(service);
    });
    teardown(function () {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createSuggestItem(label, overwriteBefore, position) {
        const suggestion = {
            label,
            range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column - overwriteBefore,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
            },
            insertText: label,
            kind: 0,
        };
        const container = {
            suggestions: [suggestion],
        };
        const provider = {
            _debugDisplayName: 'test',
            provideCompletionItems() {
                return;
            },
        };
        return new CompletionItem(position, suggestion, container, provider);
    }
    test('Suggest locality bonus can boost current word #90515', function () {
        const pos = { lineNumber: 2, column: 2 };
        const d1 = distance.distance(pos, createSuggestItem('a', 1, pos).completion);
        const d2 = distance.distance(pos, createSuggestItem('aa', 1, pos).completion);
        const d3 = distance.distance(pos, createSuggestItem('ab', 1, pos).completion);
        assert.ok(d1 > d2);
        assert.ok(d2 === d3);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci93b3JkRGlzdGFuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzlELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUd6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDekQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzVELE9BQU8sRUFDTix3QkFBd0IsRUFDeEIseUJBQXlCLEdBQ3pCLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDcEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSx1QkFBdUIsRUFB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