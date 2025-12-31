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
import { AsyncIterableObject } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { CopyAction } from '../../../../../editor/contrib/clipboard/browser/clipboard.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { accessibleViewInCodeBlock } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { reviewEdits } from '../../../inlineChat/browser/inlineChatController.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService, } from '../../../terminal/browser/terminal.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatCopyKind, IChatService } from '../../common/chatService.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { IChatCodeBlockContextProviderService, IChatWidgetService } from '../chat.js';
import { DefaultChatTextEditor, } from '../codeBlockPart.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { ApplyCodeBlockOperation, InsertCodeBlockOperation } from './codeBlockOperations.js';
const shellLangIds = ['fish', 'ps1', 'pwsh', 'powershell', 'sh', 'shellscript', 'zsh'];
export function isCodeBlockActionContext(thing) {
    return typeof thing === 'object' && thing !== null && 'code' in thing && 'element' in thing;
}
export function isCodeCompareBlockActionContext(thing) {
    return typeof thing === 'object' && thing !== null && 'element' in thing;
}
function isResponseFiltered(context) {
    return isResponseVM(context.element) && context.element.errorDetails?.responseIsFiltered;
}
class ChatCodeBlockAction extends Action2 {
    run(accessor, ...args) {
        let context = args[0];
        if (!isCodeBlockActionContext(context)) {
            const codeEditorService = accessor.get(ICodeEditorService);
            const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
            if (!editor) {
                return;
            }
            context = getContextFromEditor(editor, accessor);
            if (!isCodeBlockActionContext(context)) {
                return;
            }
        }
        return this.runWithContext(accessor, context);
    }
}
const APPLY_IN_EDITOR_ID = 'workbench.action.chat.applyInEditor';
let CodeBlockActionRendering = class CodeBlockActionRendering extends Disposable {
    static { this.ID = 'chat.codeBlockActionRendering'; }
    constructor(actionViewItemService, instantiationService, labelService) {
        super();
        const disposable = actionViewItemService.register(MenuId.ChatCodeBlock, APPLY_IN_EDITOR_ID, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instantiationService.createInstance(class extends MenuEntryActionViewItem {
                getTooltip() {
                    const context = this._context;
                    if (isCodeBlockActionContext(context) && context.codemapperUri) {
                        const label = labelService.getUriLabel(context.codemapperUri, { relative: true });
                        return localize('interactive.applyInEditorWithURL.label', 'Apply to {0}', label);
                    }
                    return super.getTooltip();
                }
                setActionContext(newContext) {
                    super.setActionContext(newContext);
                    this.updateTooltip();
                }
            }, action, undefined);
        });
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CodeBlockActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IInstantiationService),
    __param(2, ILabelService)
], CodeBlockActionRendering);
export { CodeBlockActionRendering };
export function registerChatCodeBlockActions() {
    registerAction2(class CopyCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.copyCodeBlock',
                title: localize2('interactive.copyCodeBlock.label', 'Copy'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.copy,
                menu: {
                    id: MenuId.ChatCodeBlock,
                    group: 'navigation',
                    order: 30,
                },
            });
        }
        run(accessor, ...args) {
            const context = args[0];
            if (!isCodeBlockActionContext(context) || isResponseFiltered(context)) {
                return;
            }
            const clipboardService = accessor.get(IClipboardService);
            clipboardService.writeText(context.code);
            if (isResponseVM(context.element)) {
                const chatService = accessor.get(IChatService);
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'copy',
                        codeBlockIndex: context.codeBlockIndex,
                        copyKind: ChatCopyKind.Toolbar,
                        copiedCharacters: context.code.length,
                        totalCharacters: context.code.length,
                        copiedText: context.code,
                    },
                });
            }
        }
    });
    CopyAction?.addImplementation(50000, 'chat-codeblock', (accessor) => {
        // get active code editor
        const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (!editor) {
            return false;
        }
        const editorModel = editor.getModel();
        if (!editorModel) {
            return false;
        }
        const context = getContextFromEditor(editor, accessor);
        if (!context) {
            return false;
        }
        const noSelection = editor.getSelections()?.length === 1 && editor.getSelection()?.isEmpty();
        const copiedText = noSelection
            ? editorModel.getValue()
            : (editor
                .getSelections()
                ?.reduce((acc, selection) => acc + editorModel.getValueInRange(selection), '') ?? '');
        const totalCharacters = editorModel.getValueLength();
        // Report copy to extensions
        const chatService = accessor.get(IChatService);
        const element = context.element;
        if (element) {
            chatService.notifyUserAction({
                agentId: element.agent?.id,
                command: element.slashCommand?.name,
                sessionId: element.sessionId,
                requestId: element.requestId,
                result: element.result,
                action: {
                    kind: 'copy',
                    codeBlockIndex: context.codeBlockIndex,
                    copyKind: ChatCopyKind.Action,
                    copiedText,
                    copiedCharacters: copiedText.length,
                    totalCharacters,
                },
            });
        }
        // Copy full cell if no selection, otherwise fall back on normal editor implementation
        if (noSelection) {
            accessor.get(IClipboardService).writeText(context.code);
            return true;
        }
        return false;
    });
    registerAction2(class SmartApplyInEditorAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: APPLY_IN_EDITOR_ID,
                title: localize2('interactive.applyInEditor.label', 'Apply in Editor'),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.gitPullRequestGoToChanges,
                menu: [
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(...shellLangIds.map((e) => ContextKeyExpr.notEquals(EditorContextKeys.languageId.key, e))),
                        order: 10,
                    },
                    {
                        id: MenuId.ChatCodeBlock,
                        when: ContextKeyExpr.or(...shellLangIds.map((e) => ContextKeyExpr.equals(EditorContextKeys.languageId.key, e))),
                    },
                ],
                keybinding: {
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()), accessibleViewInCodeBlock),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */ },
                    weight: 400 /* KeybindingWeight.ExternalExtension */ + 1,
                },
            });
        }
        runWithContext(accessor, context) {
            if (!this.operation) {
                this.operation = accessor
                    .get(IInstantiationService)
                    .createInstance(ApplyCodeBlockOperation);
            }
            return this.operation.run(context);
        }
    });
    registerAction2(class InsertAtCursorAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.insertCodeBlock',
                title: localize2('interactive.insertCodeBlock.label', 'Insert At Cursor'),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.insert,
                menu: [
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.location.notEqualsTo(ChatAgentLocation.Terminal)),
                        order: 20,
                    },
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Terminal)),
                        isHiddenByDefault: true,
                        order: 20,
                    },
                ],
                keybinding: {
                    when: ContextKeyExpr.or(ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()), accessibleViewInCodeBlock),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                    mac: { primary: 256 /* KeyMod.WinCtrl */ | 3 /* KeyCode.Enter */ },
                    weight: 400 /* KeybindingWeight.ExternalExtension */ + 1,
                },
            });
        }
        runWithContext(accessor, context) {
            const operation = accessor
                .get(IInstantiationService)
                .createInstance(InsertCodeBlockOperation);
            return operation.run(context);
        }
    });
    registerAction2(class InsertIntoNewFileAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.insertIntoNewFile',
                title: localize2('interactive.insertIntoNewFile.label', 'Insert into New File'),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.newFile,
                menu: {
                    id: MenuId.ChatCodeBlock,
                    group: 'navigation',
                    isHiddenByDefault: true,
                    order: 40,
                },
            });
        }
        async runWithContext(accessor, context) {
            if (isResponseFiltered(context)) {
                // When run from command palette
                return;
            }
            const editorService = accessor.get(IEditorService);
            const chatService = accessor.get(IChatService);
            editorService.openEditor({
                contents: context.code,
                languageId: context.languageId,
                resource: undefined,
            });
            if (isResponseVM(context.element)) {
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'insert',
                        codeBlockIndex: context.codeBlockIndex,
                        totalCharacters: context.code.length,
                        newFile: true,
                    },
                });
            }
        }
    });
    registerAction2(class RunInTerminalAction extends ChatCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.runInTerminal',
                title: localize2('interactive.runInTerminal.label', 'Insert into Terminal'),
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
                icon: Codicon.terminal,
                menu: [
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ContextKeyExpr.or(...shellLangIds.map((e) => ContextKeyExpr.equals(EditorContextKeys.languageId.key, e)))),
                    },
                    {
                        id: MenuId.ChatCodeBlock,
                        group: 'navigation',
                        isHiddenByDefault: true,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ...shellLangIds.map((e) => ContextKeyExpr.notEquals(EditorContextKeys.languageId.key, e))),
                    },
                ],
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                        mac: {
                            primary: 256 /* KeyMod.WinCtrl */ | 512 /* KeyMod.Alt */ | 3 /* KeyCode.Enter */,
                        },
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                        when: ContextKeyExpr.or(ChatContextKeys.inChatSession, accessibleViewInCodeBlock),
                    },
                ],
            });
        }
        async runWithContext(accessor, context) {
            if (isResponseFiltered(context)) {
                // When run from command palette
                return;
            }
            const chatService = accessor.get(IChatService);
            const terminalService = accessor.get(ITerminalService);
            const editorService = accessor.get(IEditorService);
            const terminalEditorService = accessor.get(ITerminalEditorService);
            const terminalGroupService = accessor.get(ITerminalGroupService);
            let terminal = await terminalService.getActiveOrCreateInstance();
            // isFeatureTerminal = debug terminal or task terminal
            const unusableTerminal = terminal.xterm?.isStdinDisabled || terminal.shellLaunchConfig.isFeatureTerminal;
            terminal = unusableTerminal ? await terminalService.createTerminal() : terminal;
            terminalService.setActiveInstance(terminal);
            await terminal.focusWhenReady(true);
            if (terminal.target === TerminalLocation.Editor) {
                const existingEditors = editorService.findEditors(terminal.resource);
                terminalEditorService.openEditor(terminal, { viewColumn: existingEditors?.[0].groupId });
            }
            else {
                terminalGroupService.showPanel(true);
            }
            terminal.runCommand(context.code, false);
            if (isResponseVM(context.element)) {
                chatService.notifyUserAction({
                    agentId: context.element.agent?.id,
                    command: context.element.slashCommand?.name,
                    sessionId: context.element.sessionId,
                    requestId: context.element.requestId,
                    result: context.element.result,
                    action: {
                        kind: 'runInTerminal',
                        codeBlockIndex: context.codeBlockIndex,
                        languageId: context.languageId,
                    },
                });
            }
        }
    });
    function navigateCodeBlocks(accessor, reverse) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const widget = chatWidgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const editor = codeEditorService.getFocusedCodeEditor();
        const editorUri = editor?.getModel()?.uri;
        const curCodeBlockInfo = editorUri ? widget.getCodeBlockInfoForEditor(editorUri) : undefined;
        const focused = !widget.inputEditor.hasWidgetFocus() && widget.getFocus();
        const focusedResponse = isResponseVM(focused) ? focused : undefined;
        const elementId = curCodeBlockInfo?.elementId;
        const element = elementId
            ? widget.viewModel?.getItems().find((item) => item.id === elementId)
            : undefined;
        const currentResponse = element ??
            focusedResponse ??
            widget.viewModel
                ?.getItems()
                .reverse()
                .find((item) => isResponseVM(item));
        if (!currentResponse || !isResponseVM(currentResponse)) {
            return;
        }
        widget.reveal(currentResponse);
        const responseCodeblocks = widget.getCodeBlockInfosForResponse(currentResponse);
        const focusIdx = curCodeBlockInfo
            ? (curCodeBlockInfo.codeBlockIndex + (reverse ? -1 : 1) + responseCodeblocks.length) %
                responseCodeblocks.length
            : reverse
                ? responseCodeblocks.length - 1
                : 0;
        responseCodeblocks[focusIdx]?.focus();
    }
    registerAction2(class NextCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.nextCodeBlock',
                title: localize2('interactive.nextCodeBlock.label', 'Next Code Block'),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 12 /* KeyCode.PageDown */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateCodeBlocks(accessor);
        }
    });
    registerAction2(class PreviousCodeBlockAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.previousCodeBlock',
                title: localize2('interactive.previousCodeBlock.label', 'Previous Code Block'),
                keybinding: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */,
                    mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 11 /* KeyCode.PageUp */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    when: ChatContextKeys.inChatSession,
                },
                precondition: ChatContextKeys.enabled,
                f1: true,
                category: CHAT_CATEGORY,
            });
        }
        run(accessor, ...args) {
            navigateCodeBlocks(accessor, true);
        }
    });
}
function getContextFromEditor(editor, accessor) {
    const chatWidgetService = accessor.get(IChatWidgetService);
    const chatCodeBlockContextProviderService = accessor.get(IChatCodeBlockContextProviderService);
    const model = editor.getModel();
    if (!model) {
        return;
    }
    const widget = chatWidgetService.lastFocusedWidget;
    const codeBlockInfo = widget?.getCodeBlockInfoForEditor(model.uri);
    if (!codeBlockInfo) {
        for (const provider of chatCodeBlockContextProviderService.providers) {
            const context = provider.getCodeBlockContext(editor);
            if (context) {
                return context;
            }
        }
        return;
    }
    const element = widget?.viewModel?.getItems().find((item) => item.id === codeBlockInfo.elementId);
    return {
        element,
        codeBlockIndex: codeBlockInfo.codeBlockIndex,
        code: editor.getValue(),
        languageId: editor.getModel().getLanguageId(),
        codemapperUri: codeBlockInfo.codemapperUri,
    };
}
export function registerChatCodeCompareBlockActions() {
    class ChatCompareCodeBlockAction extends Action2 {
        run(accessor, ...args) {
            const context = args[0];
            if (!isCodeCompareBlockActionContext(context)) {
                return;
                // TODO@jrieken derive context
            }
            return this.runWithContext(accessor, context);
        }
    }
    registerAction2(class ApplyEditsCompareBlockAction extends ChatCompareCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.applyCompareEdits',
                title: localize2('interactive.compare.apply', 'Apply Edits'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.gitPullRequestGoToChanges,
                precondition: ContextKeyExpr.and(EditorContextKeys.hasChanges, ChatContextKeys.editApplied.negate()),
                menu: {
                    id: MenuId.ChatCompareBlock,
                    group: 'navigation',
                    order: 1,
                },
            });
        }
        async runWithContext(accessor, context) {
            const instaService = accessor.get(IInstantiationService);
            const editorService = accessor.get(ICodeEditorService);
            const item = context.edit;
            const response = context.element;
            if (item.state?.applied) {
                // already applied
                return false;
            }
            if (!response.response.value.includes(item)) {
                // bogous item
                return false;
            }
            const firstEdit = item.edits[0]?.[0];
            if (!firstEdit) {
                return false;
            }
            const textEdits = AsyncIterableObject.fromArray(item.edits);
            const editorToApply = await editorService.openCodeEditor({ resource: item.uri }, null);
            if (editorToApply) {
                editorToApply.revealLineInCenterIfOutsideViewport(firstEdit.range.startLineNumber);
                instaService.invokeFunction(reviewEdits, editorToApply, textEdits, CancellationToken.None);
                response.setEditApplied(item, 1);
                return true;
            }
            return false;
        }
    });
    registerAction2(class DiscardEditsCompareBlockAction extends ChatCompareCodeBlockAction {
        constructor() {
            super({
                id: 'workbench.action.chat.discardCompareEdits',
                title: localize2('interactive.compare.discard', 'Discard Edits'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.trash,
                precondition: ContextKeyExpr.and(EditorContextKeys.hasChanges, ChatContextKeys.editApplied.negate()),
                menu: {
                    id: MenuId.ChatCompareBlock,
                    group: 'navigation',
                    order: 2,
                },
            });
        }
        async runWithContext(accessor, context) {
            const instaService = accessor.get(IInstantiationService);
            const editor = instaService.createInstance(DefaultChatTextEditor);
            editor.discard(context.element, context.edit);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvZGVibG9ja0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29kZWJsb2NrQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUM1RyxPQUFPLEVBQ04sT0FBTyxFQUNQLE1BQU0sRUFDTixjQUFjLEVBQ2QsZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFB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