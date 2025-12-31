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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { AccessibilityHelpNLS } from '../../../../editor/common/standaloneStrings.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { AccessibilityHelpAction } from './accessibleViewActions.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { CommentAccessibilityHelpNLS } from '../../comments/browser/commentsAccessibility.js';
import { CommentContextKeys } from '../../comments/common/commentContextKeys.js';
import { NEW_UNTITLED_FILE_COMMAND_ID } from '../../files/browser/fileConstants.js';
import { IAccessibleViewService, } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ctxHasEditorModification, ctxHasRequestInProgress, } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export class EditorAccessibilityHelpContribution extends Disposable {
    constructor() {
        super();
        this._register(AccessibilityHelpAction.addImplementation(90, 'editor', async (accessor) => {
            const codeEditorService = accessor.get(ICodeEditorService);
            const accessibleViewService = accessor.get(IAccessibleViewService);
            const instantiationService = accessor.get(IInstantiationService);
            const commandService = accessor.get(ICommandService);
            let codeEditor = codeEditorService.getActiveCodeEditor() || codeEditorService.getFocusedCodeEditor();
            if (!codeEditor) {
                await commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
                codeEditor = codeEditorService.getActiveCodeEditor();
            }
            accessibleViewService.show(instantiationService.createInstance(EditorAccessibilityHelpProvider, codeEditor));
        }));
    }
}
let EditorAccessibilityHelpProvider = class EditorAccessibilityHelpProvider extends Disposable {
    onClose() {
        this._editor.focus();
    }
    constructor(_editor, _keybindingService, _contextKeyService, accessibilityService, _configurationService) {
        super();
        this._editor = _editor;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.accessibilityService = accessibilityService;
        this._configurationService = _configurationService;
        this.id = "editor" /* AccessibleViewProviderId.Editor */;
        this.options = {
            type: "help" /* AccessibleViewType.Help */,
            readMoreUrl: 'https://go.microsoft.com/fwlink/?linkid=851010',
        };
        this.verbositySettingKey = "accessibility.verbosity.editor" /* AccessibilityVerbositySettingId.Editor */;
    }
    provideContent() {
        const options = this._editor.getOptions();
        const content = [];
        if (options.get(63 /* EditorOption.inDiffEditor */)) {
            if (options.get(96 /* EditorOption.readOnly */)) {
                content.push(AccessibilityHelpNLS.readonlyDiffEditor);
            }
            else {
                content.push(AccessibilityHelpNLS.editableDiffEditor);
            }
        }
        else {
            if (options.get(96 /* EditorOption.readOnly */)) {
                content.push(AccessibilityHelpNLS.readonlyEditor);
            }
            else {
                content.push(AccessibilityHelpNLS.editableEditor);
            }
        }
        if (this.accessibilityService.isScreenReaderOptimized() &&
            this._configurationService.getValue('accessibility.windowTitleOptimized')) {
            content.push(AccessibilityHelpNLS.defaultWindowTitleIncludesEditorState);
        }
        else {
            content.push(AccessibilityHelpNLS.defaultWindowTitleExcludingEditorState);
        }
        content.push(AccessibilityHelpNLS.toolbar);
        const chatEditInfo = getChatEditInfo(this._keybindingService, this._contextKeyService, this._editor);
        if (chatEditInfo) {
            content.push(chatEditInfo);
        }
        content.push(AccessibilityHelpNLS.listSignalSounds);
        content.push(AccessibilityHelpNLS.listAlerts);
        const chatCommandInfo = getChatCommandInfo(this._keybindingService, this._contextKeyService);
        if (chatCommandInfo) {
            content.push(chatCommandInfo);
        }
        const commentCommandInfo = getCommentCommandInfo(this._keybindingService, this._contextKeyService, this._editor);
        if (commentCommandInfo) {
            content.push(commentCommandInfo);
        }
        content.push(AccessibilityHelpNLS.suggestActions);
        content.push(AccessibilityHelpNLS.acceptSuggestAction);
        content.push(AccessibilityHelpNLS.toggleSuggestionFocus);
        if (options.get(120 /* EditorOption.stickyScroll */).enabled) {
            content.push(AccessibilityHelpNLS.stickScroll);
        }
        if (options.get(150 /* EditorOption.tabFocusMode */)) {
            content.push(AccessibilityHelpNLS.tabFocusModeOnMsg);
        }
        else {
            content.push(AccessibilityHelpNLS.tabFocusModeOffMsg);
        }
        content.push(AccessibilityHelpNLS.codeFolding);
        content.push(AccessibilityHelpNLS.intellisense);
        content.push(AccessibilityHelpNLS.showOrFocusHover);
        content.push(AccessibilityHelpNLS.goToSymbol);
        content.push(AccessibilityHelpNLS.startDebugging);
        content.push(AccessibilityHelpNLS.setBreakpoint);
        content.push(AccessibilityHelpNLS.debugExecuteSelection);
        content.push(AccessibilityHelpNLS.addToWatch);
        return content.join('\n');
    }
};
EditorAccessibilityHelpProvider = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextKeyService),
    __param(3, IAccessibilityService),
    __param(4, IConfigurationService)
], EditorAccessibilityHelpProvider);
export function getCommentCommandInfo(keybindingService, contextKeyService, editor) {
    const editorContext = contextKeyService.getContext(editor.getDomNode());
    if (editorContext.getValue(CommentContextKeys.activeEditorHasCommentingRange.key)) {
        return [
            CommentAccessibilityHelpNLS.intro,
            CommentAccessibilityHelpNLS.addComment,
            CommentAccessibilityHelpNLS.nextCommentThread,
            CommentAccessibilityHelpNLS.previousCommentThread,
            CommentAccessibilityHelpNLS.nextRange,
            CommentAccessibilityHelpNLS.previousRange,
        ].join('\n');
    }
    return;
}
export function getChatCommandInfo(keybindingService, contextKeyService) {
    if (ChatContextKeys.enabled.getValue(contextKeyService)) {
        return [AccessibilityHelpNLS.quickChat, AccessibilityHelpNLS.startInlineChat].join('\n');
    }
    return;
}
export function getChatEditInfo(keybindingService, contextKeyService, editor) {
    const editorContext = contextKeyService.getContext(editor.getDomNode());
    if (editorContext.getValue(ctxHasEditorModification.key)) {
        return AccessibilityHelpNLS.chatEditorModification + '\n' + AccessibilityHelpNLS.chatEditActions;
    }
    else if (editorContext.getValue(ctxHasRequestInProgress.key)) {
        return AccessibilityHelpNLS.chatEditorRequestInProgress;
    }
    return;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvZWRpdG9yQWNjZXNzaWJpbGl0eUhlbHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDaEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUNOLHNCQUFzQixHQUt0QixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJBQXVCLEdBQ3ZCLE1BQU0sZ0VBQWdFLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFx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