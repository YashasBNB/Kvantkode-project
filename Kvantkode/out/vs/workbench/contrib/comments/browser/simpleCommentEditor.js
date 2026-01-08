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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlQ29tbWVudEVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9zaW1wbGVDb21tZW50RWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFHTix3QkFBd0IsR0FFeEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUVOLGFBQWEsR0FFYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVsRixnQ0FBZ0M7QUFDaEMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0s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