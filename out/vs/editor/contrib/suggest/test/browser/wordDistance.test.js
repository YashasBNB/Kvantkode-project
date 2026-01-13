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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZERpc3RhbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3dvcmREaXN0YW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHOUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFM0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDN0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBR3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix5QkFBeUIsR0FDekIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNwSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFD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