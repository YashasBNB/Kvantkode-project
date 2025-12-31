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
import { EditorExtensionsRegistry, } from '../../../../editor/browser/editorExtensions.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CodeEditorWidget, } from '../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
// Allowed Editor Contributions:
import { MenuPreventer } from '../../codeEditor/browser/menuPreventer.js';
import { EditorDictation } from '../../codeEditor/browser/dictation/editorDictation.js';
import { ContextMenuController } from '../../../../editor/contrib/contextmenu/browser/contextmenu.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { TabCompletionController } from '../../snippets/browser/tabCompletion.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { clamp } from '../../../../base/common/numbers.js';
import { CopyPasteController } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { CodeActionController } from '../../../../editor/contrib/codeAction/browser/codeActionController.js';
import { DropIntoEditorController } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { InlineCompletionsController } from '../../../../editor/contrib/inlineCompletions/browser/controller/inlineCompletionsController.js';
import { LinkDetector } from '../../../../editor/contrib/links/browser/links.js';
import { MessageController } from '../../../../editor/contrib/message/browser/messageController.js';
import { SelectionClipboardContributionID } from '../../codeEditor/browser/selectionClipboard.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { ContentHoverController } from '../../../../editor/contrib/hover/browser/contentHoverController.js';
import { GlyphHoverController } from '../../../../editor/contrib/hover/browser/glyphHoverController.js';
import { PlaceholderTextContribution } from '../../../../editor/contrib/placeholderText/browser/placeholderTextContribution.js';
export const ctxCommentEditorFocused = new RawContextKey('commentEditorFocused', false);
export const MIN_EDITOR_HEIGHT = 5 * 18;
export const MAX_EDITOR_HEIGHT = 25 * 18;
let SimpleCommentEditor = class SimpleCommentEditor extends CodeEditorWidget {
    constructor(domElement, options, scopedContextKeyService, parentThread, instantiationService, codeEditorService, commandService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        const codeEditorWidgetOptions = {
            contributions: [
                {
                    id: MenuPreventer.ID,
                    ctor: MenuPreventer,
                    instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */,
                },
                {
                    id: ContextMenuController.ID,
                    ctor: ContextMenuController,
                    instantiation: 2 /* EditorContributionInstantiation.BeforeFirstInteraction */,
                },
                {
                    id: SuggestController.ID,
                    ctor: SuggestController,
                    instantiation: 0 /* EditorContributionInstantiation.Eager */,
                },
                {
                    id: SnippetController2.ID,
                    ctor: SnippetController2,
                    instantiation: 4 /* EditorContributionInstantiation.Lazy */,
                },
                {
                    id: TabCompletionController.ID,
                    ctor: TabCompletionController,
                    instantiation: 0 /* EditorContributionInstantiation.Eager */,
                }, // eager because it needs to define a context key
                {
                    id: EditorDictation.ID,
                    ctor: EditorDictation,
                    instantiation: 4 /* EditorContributionInstantiation.Lazy */,
                },
                ...EditorExtensionsRegistry.getSomeEditorContributions([
                    CopyPasteController.ID,
                    DropIntoEditorController.ID,
                    LinkDetector.ID,
                    MessageController.ID,
                    ContentHoverController.ID,
                    GlyphHoverController.ID,
                    SelectionClipboardContributionID,
                    InlineCompletionsController.ID,
                    CodeActionController.ID,
                    PlaceholderTextContribution.ID,
                ]),
            ],
            contextMenuId: MenuId.SimpleEditorContext,
        };
        super(domElement, options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, scopedContextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
        this._commentEditorFocused = ctxCommentEditorFocused.bindTo(scopedContextKeyService);
        this._commentEditorEmpty = CommentContextKeys.commentIsEmpty.bindTo(scopedContextKeyService);
        this._commentEditorEmpty.set(!this.getModel()?.getValueLength());
        this._parentThread = parentThread;
        this._register(this.onDidFocusEditorWidget((_) => this._commentEditorFocused.set(true)));
        this._register(this.onDidChangeModelContent((e) => this._commentEditorEmpty.set(!this.getModel()?.getValueLength())));
        this._register(this.onDidBlurEditorWidget((_) => this._commentEditorFocused.reset()));
    }
    getParentThread() {
        return this._parentThread;
    }
    _getActions() {
        return EditorExtensionsRegistry.getEditorActions();
    }
    updateOptions(newOptions) {
        const withLineNumberRemoved = { ...newOptions, lineNumbers: 'off' };
        super.updateOptions(withLineNumberRemoved);
    }
    static getEditorOptions(configurationService) {
        return {
            wordWrap: 'on',
            glyphMargin: false,
            lineNumbers: 'off',
            folding: false,
            selectOnLineNumbers: false,
            scrollbar: {
                vertical: 'visible',
                verticalScrollbarSize: 14,
                horizontal: 'auto',
                useShadows: true,
                verticalHasArrows: false,
                horizontalHasArrows: false,
                alwaysConsumeMouseWheel: false,
            },
            overviewRulerLanes: 2,
            lineDecorationsWidth: 0,
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            fixedOverflowWidgets: true,
            acceptSuggestionOnEnter: 'smart',
            minimap: {
                enabled: false,
            },
            dropIntoEditor: { enabled: true },
            autoClosingBrackets: configurationService.getValue('editor.autoClosingBrackets'),
            quickSuggestions: false,
            accessibilitySupport: configurationService.getValue('editor.accessibilitySupport'),
            fontFamily: configurationService.getValue('editor.fontFamily'),
            fontSize: configurationService.getValue('editor.fontSize'),
        };
    }
};
SimpleCommentEditor = __decorate([
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, ICommandService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], SimpleCommentEditor);
export { SimpleCommentEditor };
export function calculateEditorHeight(parentEditor, editor, currentHeight) {
    const layoutInfo = editor.getLayoutInfo();
    const lineHeight = editor.getOption(68 /* EditorOption.lineHeight */);
    const contentHeight = editor._getViewModel()?.getLineCount() * lineHeight; // Can't just call getContentHeight() because it returns an incorrect, large, value when the editor is first created.
    if (contentHeight > layoutInfo.height ||
        (contentHeight < layoutInfo.height && currentHeight > MIN_EDITOR_HEIGHT)) {
        const linesToAdd = Math.ceil((contentHeight - layoutInfo.height) / lineHeight);
        const proposedHeight = layoutInfo.height + lineHeight * linesToAdd;
        return clamp(proposedHeight, MIN_EDITOR_HEIGHT, clamp(parentEditor.getLayoutInfo().height - 90, MIN_EDITOR_HEIGHT, MAX_EDITOR_HEIGHT));
    }
    return currentHeight;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tbWVudEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvc2ltcGxlQ29tbWVudEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBR04sd0JBQXdCLEdBRXhCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFFTixhQUFhLEdBRWIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFbEYsZ0NBQWdDO0FBQ2hDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0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