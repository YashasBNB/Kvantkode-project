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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW1tZXQvdGVzdC9icm93c2VyL2VtbWV0QWN0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF5QixpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsTUFBTSx3QkFBd0I7SUFHN0IsWUFBWSxTQUFpQjtRQUM1QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtJQUMzQixDQUFDO0lBRU0sVUFBVSxDQUFDLElBQVk7UUFDN0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO0lBQ3RCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBQ25CLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDeEQsa0JBQWtCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsb0JBQW9CLEVBQUUsRUFBRTtZQUN0RSxNQUFNLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUVsRSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNyRSxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JFLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUUxRSxTQUFTLGFBQWEsQ0FDckIsSUFBWSxFQUNaLFNBQWlCLEVBQ2pCLGdCQUF5QixFQUN6QixzQkFBK0I7Z0JBRS9CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDL0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtnQkFDdEMsQ0FBQztnQkFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUN2QixNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQy9DLE1BQU0sRUFDTixJQUFJLHdCQUF3QixDQUFDLFNBQVMsQ0FBQyxDQUN2QyxDQUFBO2dCQUNELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO2dCQUNwQyxDQUFDO2dCQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsc0JBQXNCLENBQUMsQ0FBQTtZQUNsRSxDQUFDO1lBRUQsc0RBQXNEO1lBQ3RELGFBQWEsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25FLGFBQWEsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ3pFLGFBQWEsQ0FBQyxVQUFVLEVBQUUsb0JBQW9CLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ25FLGFBQWEsQ0FBQyxlQUFlLEVBQUUsNkJBQTZCLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBRXRGLDBEQUEwRDtZQUMxRCwrREFBK0Q7WUFDL0Qsa0VBQWtFO1lBRWxFLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsdUNBQXVDLEVBQUUsQ0FBQTtBQUMxQyxDQUFDLENBQUMsQ0FBQSJ9