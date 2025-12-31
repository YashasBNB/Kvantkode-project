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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub0RlZmluaXRpb25BdFBvc2l0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL2xpbmsvZ29Ub0RlZmluaXRpb25BdFBvc2l0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBdUIsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFOUYsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHlDQUF5QyxDQUFBO0FBR2hELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQU9oRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sZ0JBQWdCLEdBR2hCLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDckQsT0FBTyxFQUFFLHdC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