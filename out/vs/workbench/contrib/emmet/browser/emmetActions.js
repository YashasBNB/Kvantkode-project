/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, } from '../../../../editor/browser/editorExtensions.js';
import { grammarsExtPoint, } from '../../../services/textMate/common/TMGrammars.js';
import { IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
class GrammarContributions {
    static { this._grammars = {}; }
    constructor(contributions) {
        if (!Object.keys(GrammarContributions._grammars).length) {
            this.fillModeScopeMap(contributions);
        }
    }
    fillModeScopeMap(contributions) {
        contributions.forEach((contribution) => {
            contribution.value.forEach((grammar) => {
                if (grammar.language && grammar.scopeName) {
                    GrammarContributions._grammars[grammar.language] = grammar.scopeName;
                }
            });
        });
    }
    getGrammar(mode) {
        return GrammarContributions._grammars[mode];
    }
}
export class EmmetEditorAction extends EditorAction {
    constructor(opts) {
        super(opts);
        this._lastGrammarContributions = null;
        this._lastExtensionService = null;
        this.emmetActionName = opts.actionName;
    }
    static { this.emmetSupportedModes = [
        'html',
        'css',
        'xml',
        'xsl',
        'haml',
        'jade',
        'jsx',
        'slim',
        'scss',
        'sass',
        'less',
        'stylus',
        'styl',
        'svg',
    ]; }
    _withGrammarContributions(extensionService) {
        if (this._lastExtensionService !== extensionService) {
            this._lastExtensionService = extensionService;
            this._lastGrammarContributions = extensionService
                .readExtensionPointContributions(grammarsExtPoint)
                .then((contributions) => {
                return new GrammarContributions(contributions);
            });
        }
        return this._lastGrammarContributions || Promise.resolve(null);
    }
    run(accessor, editor) {
        const extensionService = accessor.get(IExtensionService);
        const commandService = accessor.get(ICommandService);
        return this._withGrammarContributions(extensionService).then((grammarContributions) => {
            if (this.id === 'editor.emmet.action.expandAbbreviation' && grammarContributions) {
                return commandService.executeCommand('emmet.expandAbbreviation', EmmetEditorAction.getLanguage(editor, grammarContributions));
            }
            return undefined;
        });
    }
    static getLanguage(editor, grammars) {
        const model = editor.getModel();
        const selection = editor.getSelection();
        if (!model || !selection) {
            return null;
        }
        const position = selection.getStartPosition();
        model.tokenization.tokenizeIfCheap(position.lineNumber);
        const languageId = model.getLanguageIdAtPosition(position.lineNumber, position.column);
        const syntax = languageId.split('.').pop();
        if (!syntax) {
            return null;
        }
        const checkParentMode = () => {
            const languageGrammar = grammars.getGrammar(syntax);
            if (!languageGrammar) {
                return syntax;
            }
            const languages = languageGrammar.split('.');
            if (languages.length < 2) {
                return syntax;
            }
            for (let i = 1; i < languages.length; i++) {
                const language = languages[languages.length - i];
                if (this.emmetSupportedModes.indexOf(language) !== -1) {
                    return language;
                }
            }
            return syntax;
        };
        return {
            language: syntax,
            parentMode: checkParentMode(),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZW1tZXQvYnJvd3Nlci9lbW1ldEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLFlBQVksR0FHWixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBV2xGLE1BQU0sb0JBQW9CO2FBQ1YsY0FBUyxHQUFpQixFQUFFLENBQUE7SUFFM0MsWUFBWSxhQUFzRTtRQUNqRixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDckMsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxhQUFzRTtRQUM5RixhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDdEMsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDdEMsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDM0Msb0JBQW9CLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFBO2dCQUNyRSxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTSxVQUFVLENBQUMsSUFBWTtRQUM3QixPQUFPLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM1QyxDQUFDOztBQU9GLE1BQU0sT0FBZ0IsaUJBQWtCLFNBQVEsWUFBWTtJQUczRCxZQUFZLElBQXlCO1FBQ3BDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQXFCSiw4QkFBeUIsR0FBeUMsSUFBSSxDQUFBO1FBQ3RFLDBCQUFxQixHQUE2QixJQUFJLENBQUE7UUFyQjdELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QyxDQUFDO2FBRXVCLHdCQUFtQixHQUFHO1FBQzdDLE1BQU07UUFDTixLQUFLO1FBQ0wsS0FBSztRQUNMLEtBQUs7UUFDTCxNQUFNO1FBQ04sTUFBTTtRQUNOLEtBQUs7UUFDTCxNQUFNO1FBQ04sTUFBTTtRQUNOLE1BQU07UUFDTixNQUFNO1FBQ04sUUFBUTtRQUNSLE1BQU07UUFDTixLQUFLO0tBQ0wsQUFmMEMsQ0FlMUM7SUFJTyx5QkFBeUIsQ0FDaEMsZ0JBQW1DO1FBRW5DLElBQUksSUFBSSxDQUFDLHFCQUFxQixLQUFLLGdCQUFnQixFQUFFLENBQUM7WUFDckQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLGdCQUFnQixDQUFBO1lBQzdDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxnQkFBZ0I7aUJBQy9DLCtCQUErQixDQUFDLGdCQUFnQixDQUFDO2lCQUNqRCxJQUFJLENBQUMsQ0FBQyxhQUFhLEVBQUUsRUFBRTtnQkFDdkIsT0FBTyxJQUFJLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQy9DLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHlCQUF5QixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVNLEdBQUcsQ0FBQyxRQUEwQixFQUFFLE1BQW1CO1FBQ3pELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFO1lBQ3JGLElBQUksSUFBSSxDQUFDLEVBQUUsS0FBSyx3Q0FBd0MsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUNsRixPQUFPLGNBQWMsQ0FBQyxjQUFjLENBQ25DLDBCQUEwQixFQUMxQixpQkFBaUIsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLG9CQUFvQixDQUFDLENBQzNELENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFtQixFQUFFLFFBQStCO1FBQzdFLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUE7UUFFdkMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQzdDLEtBQUssQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEYsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUUxQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxHQUFXLEVBQUU7WUFDcEMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNuRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ3RCLE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDNUMsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxQixPQUFPLE1BQU0sQ0FBQTtZQUNkLENBQUM7WUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7b0JBQ3ZELE9BQU8sUUFBUSxDQUFBO2dCQUNoQixDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQyxDQUFBO1FBRUQsT0FBTztZQUNOLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLFVBQVUsRUFBRSxlQUFlLEVBQUU7U0FDN0IsQ0FBQTtJQUNGLENBQUMifQ==