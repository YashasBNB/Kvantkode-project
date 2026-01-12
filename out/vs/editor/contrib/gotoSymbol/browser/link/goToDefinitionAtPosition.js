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
var GotoDefinitionAtPositionEditorContribution_1;
import { createCancelablePromise } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import './goToDefinitionAtPosition.css';
import { EditorState } from '../../../editorState/browser/editorState.js';
import { registerEditorContribution, } from '../../../../browser/editorExtensions.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ITextModelService } from '../../../../common/services/resolverService.js';
import { ClickLinkGesture, } from './clickLinkGesture.js';
import { PeekContext } from '../../../peekView/browser/peekView.js';
import * as nls from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { DefinitionAction } from '../goToCommands.js';
import { getDefinitionsAtPosition } from '../goToSymbol.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { ModelDecorationInjectedTextOptions } from '../../../../common/model/textModel.js';
let GotoDefinitionAtPositionEditorContribution = class GotoDefinitionAtPositionEditorContribution {
    static { GotoDefinitionAtPositionEditorContribution_1 = this; }
    static { this.ID = 'editor.contrib.gotodefinitionatposition'; }
    static { this.MAX_SOURCE_PREVIEW_LINES = 8; }
    constructor(editor, textModelResolverService, languageService, languageFeaturesService) {
        this.textModelResolverService = textModelResolverService;
        this.languageService = languageService;
        this.languageFeaturesService = languageFeaturesService;
        this.toUnhook = new DisposableStore();
        this.toUnhookForKeyboard = new DisposableStore();
        this.currentWordAtPosition = null;
        this.previousPromise = null;
        this.editor = editor;
        this.linkDecorations = this.editor.createDecorationsCollection();
        const linkGesture = new ClickLinkGesture(editor);
        this.toUnhook.add(linkGesture);
        this.toUnhook.add(linkGesture.onMouseMoveOrRelevantKeyDown(([mouseEvent, keyboardEvent]) => {
            this.startFindDefinitionFromMouse(mouseEvent, keyboardEvent ?? undefined);
        }));
        this.toUnhook.add(linkGesture.onExecute((mouseEvent) => {
            if (this.isEnabled(mouseEvent)) {
                this.gotoDefinition(mouseEvent.target.position, mouseEvent.hasSideBySideModifier)
                    .catch((error) => {
                    onUnexpectedError(error);
                })
                    .finally(() => {
                    this.removeLinkDecorations();
                });
            }
        }));
        this.toUnhook.add(linkGesture.onCancel(() => {
            this.removeLinkDecorations();
            this.currentWordAtPosition = null;
        }));
    }
    static get(editor) {
        return editor.getContribution(GotoDefinitionAtPositionEditorContribution_1.ID);
    }
    async startFindDefinitionFromCursor(position) {
        // For issue: https://github.com/microsoft/vscode/issues/46257
        // equivalent to mouse move with meta/ctrl key
        // First find the definition and add decorations
        // to the editor to be shown with the content hover widget
        await this.startFindDefinition(position);
        // Add listeners for editor cursor move and key down events
        // Dismiss the "extended" editor decorations when the user hides
        // the hover widget. There is no event for the widget itself so these
        // serve as a best effort. After removing the link decorations, the hover
        // widget is clean and will only show declarations per next request.
        this.toUnhookForKeyboard.add(this.editor.onDidChangeCursorPosition(() => {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            this.toUnhookForKeyboard.clear();
        }));
        this.toUnhookForKeyboard.add(this.editor.onKeyDown((e) => {
            if (e) {
                this.currentWordAtPosition = null;
                this.removeLinkDecorations();
                this.toUnhookForKeyboard.clear();
            }
        }));
    }
    startFindDefinitionFromMouse(mouseEvent, withKey) {
        // check if we are active and on a content widget
        if (mouseEvent.target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ &&
            this.linkDecorations.length > 0) {
            return;
        }
        if (!this.editor.hasModel() || !this.isEnabled(mouseEvent, withKey)) {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            return;
        }
        const position = mouseEvent.target.position;
        this.startFindDefinition(position);
    }
    async startFindDefinition(position) {
        // Dispose listeners for updating decorations when using keyboard to show definition hover
        this.toUnhookForKeyboard.clear();
        // Find word at mouse position
        const word = position ? this.editor.getModel()?.getWordAtPosition(position) : null;
        if (!word) {
            this.currentWordAtPosition = null;
            this.removeLinkDecorations();
            return;
        }
        // Return early if word at position is still the same
        if (this.currentWordAtPosition &&
            this.currentWordAtPosition.startColumn === word.startColumn &&
            this.currentWordAtPosition.endColumn === word.endColumn &&
            this.currentWordAtPosition.word === word.word) {
            return;
        }
        this.currentWordAtPosition = word;
        // Find definition and decorate word if found
        const state = new EditorState(this.editor, 4 /* CodeEditorStateFlag.Position */ |
            1 /* CodeEditorStateFlag.Value */ |
            2 /* CodeEditorStateFlag.Selection */ |
            8 /* CodeEditorStateFlag.Scroll */);
        if (this.previousPromise) {
            this.previousPromise.cancel();
            this.previousPromise = null;
        }
        this.previousPromise = createCancelablePromise((token) => this.findDefinition(position, token));
        let results;
        try {
            results = await this.previousPromise;
        }
        catch (error) {
            onUnexpectedError(error);
            return;
        }
        if (!results || !results.length || !state.validate(this.editor)) {
            this.removeLinkDecorations();
            return;
        }
        const linkRange = results[0].originSelectionRange
            ? Range.lift(results[0].originSelectionRange)
            : new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
        // Multiple results
        if (results.length > 1) {
            let combinedRange = linkRange;
            for (const { originSelectionRange } of results) {
                if (originSelectionRange) {
                    combinedRange = Range.plusRange(combinedRange, originSelectionRange);
                }
            }
            this.addDecoration(combinedRange, new MarkdownString().appendText(nls.localize('multipleResults', 'Click to show {0} definitions.', results.length)));
        }
        else {
            // Single result
            const result = results[0];
            if (!result.uri) {
                return;
            }
            return this.textModelResolverService.createModelReference(result.uri).then((ref) => {
                if (!ref.object || !ref.object.textEditorModel) {
                    ref.dispose();
                    return;
                }
                const { object: { textEditorModel }, } = ref;
                const { startLineNumber } = result.range;
                if (startLineNumber < 1 || startLineNumber > textEditorModel.getLineCount()) {
                    // invalid range
                    ref.dispose();
                    return;
                }
                const previewValue = this.getPreviewValue(textEditorModel, startLineNumber, result);
                const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(textEditorModel.uri);
                this.addDecoration(linkRange, previewValue
                    ? new MarkdownString().appendCodeblock(languageId ? languageId : '', previewValue)
                    : undefined);
                ref.dispose();
            });
        }
    }
    getPreviewValue(textEditorModel, startLineNumber, result) {
        let rangeToUse = result.range;
        const numberOfLinesInRange = rangeToUse.endLineNumber - rangeToUse.startLineNumber;
        if (numberOfLinesInRange >= GotoDefinitionAtPositionEditorContribution_1.MAX_SOURCE_PREVIEW_LINES) {
            rangeToUse = this.getPreviewRangeBasedOnIndentation(textEditorModel, startLineNumber);
        }
        rangeToUse = textEditorModel.validateRange(rangeToUse);
        const previewValue = this.stripIndentationFromPreviewRange(textEditorModel, startLineNumber, rangeToUse);
        return previewValue;
    }
    stripIndentationFromPreviewRange(textEditorModel, startLineNumber, previewRange) {
        const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumber);
        let minIndent = startIndent;
        for (let endLineNumber = startLineNumber + 1; endLineNumber < previewRange.endLineNumber; endLineNumber++) {
            const endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumber);
            minIndent = Math.min(minIndent, endIndent);
        }
        const previewValue = textEditorModel
            .getValueInRange(previewRange)
            .replace(new RegExp(`^\\s{${minIndent - 1}}`, 'gm'), '')
            .trim();
        return previewValue;
    }
    getPreviewRangeBasedOnIndentation(textEditorModel, startLineNumber) {
        const startIndent = textEditorModel.getLineFirstNonWhitespaceColumn(startLineNumber);
        const maxLineNumber = Math.min(textEditorModel.getLineCount(), startLineNumber + GotoDefinitionAtPositionEditorContribution_1.MAX_SOURCE_PREVIEW_LINES);
        let endLineNumber = startLineNumber + 1;
        for (; endLineNumber < maxLineNumber; endLineNumber++) {
            const endIndent = textEditorModel.getLineFirstNonWhitespaceColumn(endLineNumber);
            if (startIndent === endIndent) {
                break;
            }
        }
        return new Range(startLineNumber, 1, endLineNumber + 1, 1);
    }
    addDecoration(range, hoverMessage) {
        const newDecorations = {
            range: range,
            options: {
                description: 'goto-definition-link',
                inlineClassName: 'goto-definition-link',
                hoverMessage,
            },
        };
        this.linkDecorations.set([newDecorations]);
    }
    removeLinkDecorations() {
        this.linkDecorations.clear();
    }
    isEnabled(mouseEvent, withKey) {
        return (this.editor.hasModel() &&
            mouseEvent.isLeftClick &&
            mouseEvent.isNoneOrSingleMouseDown &&
            mouseEvent.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            !(mouseEvent.target.detail.injectedText?.options instanceof ModelDecorationInjectedTextOptions) &&
            (mouseEvent.hasTriggerModifier || (withKey ? withKey.keyCodeIsTriggerKey : false)) &&
            this.languageFeaturesService.definitionProvider.has(this.editor.getModel()));
    }
    findDefinition(position, token) {
        const model = this.editor.getModel();
        if (!model) {
            return Promise.resolve(null);
        }
        return getDefinitionsAtPosition(this.languageFeaturesService.definitionProvider, model, position, false, token);
    }
    gotoDefinition(position, openToSide) {
        this.editor.setPosition(position);
        return this.editor.invokeWithinContext((accessor) => {
            const canPeek = !openToSide &&
                this.editor.getOption(93 /* EditorOption.definitionLinkOpensInPeek */) &&
                !this.isInPeekEditor(accessor);
            const action = new DefinitionAction({ openToSide, openInPeek: canPeek, muteMessage: true }, { title: { value: '', original: '' }, id: '', precondition: undefined });
            return action.run(accessor);
        });
    }
    isInPeekEditor(accessor) {
        const contextKeyService = accessor.get(IContextKeyService);
        return PeekContext.inPeekEditor.getValue(contextKeyService);
    }
    dispose() {
        this.toUnhook.dispose();
        this.toUnhookForKeyboard.dispose();
    }
};
GotoDefinitionAtPositionEditorContribution = GotoDefinitionAtPositionEditorContribution_1 = __decorate([
    __param(1, ITextModelService),
    __param(2, ILanguageService),
    __param(3, ILanguageFeaturesService)
], GotoDefinitionAtPositionEditorContribution);
export { GotoDefinitionAtPositionEditorContribution };
registerEditorContribution(GotoDefinitionAtPositionEditorContribution.ID, GotoDefinitionAtPositionEditorContribution, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0RlZmluaXRpb25BdFBvc2l0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvU3ltYm9sL2Jyb3dzZXIvbGluay9nb1RvRGVmaW5pdGlvbkF0UG9zaXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUF1QixXQUFXLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU5RixPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0seUNBQXlDLENBQUE7QUFHaEQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBT2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNyRCxPQUFPLEVB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