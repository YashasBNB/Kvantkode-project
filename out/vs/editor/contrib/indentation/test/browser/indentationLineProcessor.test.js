/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { IndentationContextProcessor, ProcessedIndentRulesSupport, } from '../../../../common/languages/supports/indentationLineProcessor.js';
import { Language, registerLanguage, registerLanguageConfiguration, registerTokenizationSupport, } from './indentation.test.js';
import { withTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { Range } from '../../../../common/core/range.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { LanguageService } from '../../../../common/services/languageService.js';
import { TestLanguageConfigurationService } from '../../../../test/common/modes/testLanguageConfigurationService.js';
import { ILanguageService } from '../../../../common/languages/language.js';
suite('Indentation Context Processor - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('brackets inside of string', () => {
        const model = createTextModel(['const someVar = "{some text}"'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 2 /* StandardTokenType.String */ },
                    { startIndex: 28, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(1, 23, 1, 23));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someVar = "some');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), ' text"');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), '');
        });
    });
    test('brackets inside of comment', () => {
        const model = createTextModel([
            'const someVar2 = /*(a])*/',
            'const someVar = /* [()] some other t{e}xt() */ "some text"',
        ].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 16, standardTokenType: 1 /* StandardTokenType.Comment */ },
                    { startIndex: 46, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 47, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(2, 29, 2, 35));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someVar = /*  some');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), ' text */ "some text"');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), 'const someVar2 = /*a*/');
        });
    });
    test('brackets inside of regex', () => {
        const model = createTextModel(['const someRegex2 = /(()))]/;', 'const someRegex = /()a{h}{s}[(a}87(9a9()))]/;'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 19, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                    { startIndex: 27, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 18, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                    { startIndex: 44, standardTokenType: 0 /* StandardTokenType.Other */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationContextProcessor = new IndentationContextProcessor(model, languageConfigurationService);
            const processedContext = indentationContextProcessor.getProcessedTokenContextAroundRange(new Range(1, 25, 2, 33));
            assert.strictEqual(processedContext.beforeRangeProcessedTokens.getLineContent(), 'const someRegex2 = /');
            assert.strictEqual(processedContext.afterRangeProcessedTokens.getLineContent(), '879a9/;');
            assert.strictEqual(processedContext.previousLineProcessedTokens.getLineContent(), '');
        });
    });
});
suite('Processed Indent Rules Support - TypeScript/JavaScript', () => {
    const languageId = Language.TypeScript;
    let disposables;
    let serviceCollection;
    setup(() => {
        disposables = new DisposableStore();
        const languageService = new LanguageService();
        const languageConfigurationService = new TestLanguageConfigurationService();
        disposables.add(languageService);
        disposables.add(languageConfigurationService);
        disposables.add(registerLanguage(languageService, languageId));
        disposables.add(registerLanguageConfiguration(languageConfigurationService, languageId));
        serviceCollection = new ServiceCollection([ILanguageService, languageService], [ILanguageConfigurationService, languageConfigurationService]);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should increase', () => {
        const model = createTextModel(['const someVar = {', 'const someVar2 = "{"', 'const someVar3 = /*{*/'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 17, standardTokenType: 1 /* StandardTokenType.Comment */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldIncrease(3), false);
        });
    });
    test('should decrease', () => {
        const model = createTextModel(['}', '"])some text}"', '])*/'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }],
                [{ startIndex: 0, standardTokenType: 2 /* StandardTokenType.String */ }],
                [{ startIndex: 0, standardTokenType: 1 /* StandardTokenType.Comment */ }],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldDecrease(3), false);
        });
    });
    test('should increase next line', () => {
        const model = createTextModel(['if()', 'const someString = "if()"', 'const someRegex = /if()/'].join('\n'), languageId, {});
        disposables.add(model);
        withTestCodeEditor(model, { autoIndent: 'full', serviceCollection }, (editor, viewModel, instantiationService) => {
            const tokens = [
                [{ startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ }],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 19, standardTokenType: 2 /* StandardTokenType.String */ },
                ],
                [
                    { startIndex: 0, standardTokenType: 0 /* StandardTokenType.Other */ },
                    { startIndex: 18, standardTokenType: 3 /* StandardTokenType.RegEx */ },
                ],
            ];
            disposables.add(registerTokenizationSupport(instantiationService, tokens, languageId));
            const languageConfigurationService = instantiationService.get(ILanguageConfigurationService);
            const indentationRulesSupport = languageConfigurationService.getLanguageConfiguration(languageId).indentRulesSupport;
            if (!indentationRulesSupport) {
                assert.fail('indentationRulesSupport should be defined');
            }
            const processedIndentRulesSupport = new ProcessedIndentRulesSupport(model, indentationRulesSupport, languageConfigurationService);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(1), true);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(2), false);
            assert.strictEqual(processedIndentRulesSupport.shouldIndentNextLine(3), false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9pbmRlbnRhdGlvbi90ZXN0L2Jyb3dzZXIvaW5kZW50YXRpb25MaW5lUHJvY2Vzc29yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUM3RyxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLDJCQUEyQixHQUMzQixNQUFNLG1FQUFtRSxDQUFBO0FBQzFFLE9BQU8sRUFDTixRQUFRLEVBQ1IsZ0JBQWdCLEVBQ2hCLDZCQUE2QixFQUM3QiwyQkFBMkIsR0FFM0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUzRSxLQUFLLENBQUMsdURBQXVELEVBQUUsR0FBRyxFQUFFO0lBQ25F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