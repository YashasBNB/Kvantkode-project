/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EmmetEditorAction } from '../../browser/emmetActions.js';
import { withTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class MockGrammarContributions {
    constructor(scopeName) {
        this.scopeName = scopeName;
    }
    getGrammar(mode) {
        return this.scopeName;
    }
}
suite('Emmet', () => {
    test('Get language mode and parent mode for emmet', () => {
        withTestCodeEditor([], {}, (editor, viewModel, instantiationService) => {
            const languageService = instantiationService.get(ILanguageService);
            const disposables = new DisposableStore();
            disposables.add(languageService.registerLanguage({ id: 'markdown' }));
            disposables.add(languageService.registerLanguage({ id: 'handlebars' }));
            disposables.add(languageService.registerLanguage({ id: 'nunjucks' }));
            disposables.add(languageService.registerLanguage({ id: 'laravel-blade' }));
            function testIsEnabled(mode, scopeName, expectedLanguage, expectedParentLanguage) {
                const model = editor.getModel();
                if (!model) {
                    assert.fail('Editor model not found');
                }
                model.setLanguage(mode);
                const langOutput = EmmetEditorAction.getLanguage(editor, new MockGrammarContributions(scopeName));
                if (!langOutput) {
                    assert.fail('langOutput not found');
                }
                assert.strictEqual(langOutput.language, expectedLanguage);
                assert.strictEqual(langOutput.parentMode, expectedParentLanguage);
            }
            // syntaxes mapped using the scope name of the grammar
            testIsEnabled('markdown', 'text.html.markdown', 'markdown', 'html');
            testIsEnabled('handlebars', 'text.html.handlebars', 'handlebars', 'html');
            testIsEnabled('nunjucks', 'text.html.nunjucks', 'nunjucks', 'html');
            testIsEnabled('laravel-blade', 'text.html.php.laravel-blade', 'laravel-blade', 'html');
            // languages that have different Language Id and scopeName
            // testIsEnabled('razor', 'text.html.cshtml', 'razor', 'html');
            // testIsEnabled('HTML (Eex)', 'text.html.elixir', 'boo', 'html');
            disposables.dispose();
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VtbWV0L3Rlc3QvYnJvd3Nlci9lbW1ldEFjdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBeUIsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLE1BQU0sd0JBQXdCO0lBRzdCLFlBQVksU0FBaUI7UUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7SUFDM0IsQ0FBQztJQUVNLFVBQVUsQ0FBQyxJQUFZO1FBQzdCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtJQUN0QixDQUFDO0NBQ0Q7QUFFRCxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUNuQixJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3hELGtCQUFrQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFLEVBQUU7WUFDdEUsTUFBTSxlQUFlLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFFbEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUN6QyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3ZFLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRSxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFMUUsU0FBUyxhQUFhLENBQ3JCLElBQVksRUFDWixTQUFpQixFQUNqQixnQkFBeUIsRUFDekIsc0JBQStCO2dCQUUvQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7Z0JBQy9CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDWixNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUE7Z0JBQ3RDLENBQUM7Z0JBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDdkIsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsV0FBVyxDQUMvQyxNQUFNLEVBQ04sSUFBSSx3QkFBd0IsQ0FBQyxTQUFTLENBQUMsQ0FDdkMsQ0FBQTtnQkFDRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtnQkFDcEMsQ0FBQztnQkFFRCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUVELHNEQUFzRDtZQUN0RCxhQUFhLENBQUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRSxhQUFhLENBQUMsWUFBWSxFQUFFLHNCQUFzQixFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6RSxhQUFhLENBQUMsVUFBVSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRSxhQUFhLENBQUMsZUFBZSxFQUFFLDZCQUE2QixFQUFFLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUV0RiwwREFBMEQ7WUFDMUQsK0RBQStEO1lBQy9ELGtFQUFrRTtZQUVsRSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==