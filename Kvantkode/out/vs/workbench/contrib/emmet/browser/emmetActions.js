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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1tZXRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lbW1ldC9icm93c2VyL2VtbWV0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sWUFBWSxHQUdaLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFXbEYsTUFBTSxvQkFBb0I7YUFDVixjQUFTLEdBQWlCLEVBQUUsQ0FBQTtJQUUzQyxZQUFZLGFBQXNFO1FBQ2pGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUNyQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLGFBQXNFO1FBQzlGLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtZQUN0QyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUN0QyxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUMzQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUE7Z0JBQ3JFLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gs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