/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { marked } from '../../../../../base/common/marked/marked.js';
import { observableFromEvent, waitForState } from '../../../../../base/common/observable.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { ResourceNotebookCellEdit } from '../../../bulkEdit/browser/bulkCellEdits.js';
import { MENU_INLINE_CHAT_WIDGET_SECONDARY } from '../../../inlineChat/common/inlineChat.js';
import { CellKind, NOTEBOOK_EDITOR_ID, } from '../../../notebook/common/notebookCommon.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../../notebook/common/notebookContextKeys.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, IChatEditingService, isChatEditingActionContext, } from '../../common/chatEditingService.js';
import { ChatAgentVoteDirection, IChatService, } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { EditsViewId, IChatWidgetService } from '../chat.js';
import { ChatViewPane } from '../chatViewPane.js';
import { CHAT_CATEGORY } from './chatActions.js';
export const MarkUnhelpfulActionId = 'workbench.action.chat.markUnhelpful';
const enableFeedbackConfig = 'config.telemetry.feedback.enabled';
export function registerChatTitleActions() {
    registerAction2(class MarkHelpfulAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.markHelpful',
                title: localize2('interactive.helpful.label', 'Helpful'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.thumbsup,
                toggled: ChatContextKeys.responseVote.isEqualTo('up'),
                menu: [
                    {
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                    {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                ],
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'vote',
                    direction: ChatAgentVoteDirection.Up,
                    reason: undefined,
                },
            });
            item.setVote(ChatAgentVoteDirection.Up);
            item.setVoteDownReason(undefined);
        }
    });
    registerAction2(class MarkUnhelpfulAction extends Action2 {
        constructor() {
            super({
                id: MarkUnhelpfulActionId,
                title: localize2('interactive.unhelpful.label', 'Unhelpful'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.thumbsdown,
                toggled: ChatContextKeys.responseVote.isEqualTo('down'),
                menu: [
                    {
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 2,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                    {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 2,
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ChatContextKeys.responseHasError.negate(), ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                ],
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const reason = args[1];
            if (typeof reason !== 'string') {
                return;
            }
            item.setVote(ChatAgentVoteDirection.Down);
            item.setVoteDownReason(reason);
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'vote',
                    direction: ChatAgentVoteDirection.Down,
                    reason: item.voteDownReason,
                },
            });
        }
    });
    registerAction2(class ReportIssueForBugAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.reportIssueForBug',
                title: localize2('interactive.reportIssueForBug.label', 'Report Issue'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.report,
                menu: [
                    {
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        order: 3,
                        when: ContextKeyExpr.and(ChatContextKeys.responseSupportsIssueReporting, ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                    {
                        id: MENU_INLINE_CHAT_WIDGET_SECONDARY,
                        group: 'navigation',
                        order: 3,
                        when: ContextKeyExpr.and(ChatContextKeys.responseSupportsIssueReporting, ChatContextKeys.isResponse, ContextKeyExpr.has(enableFeedbackConfig)),
                    },
                ],
            });
        }
        run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            chatService.notifyUserAction({
                agentId: item.agent?.id,
                command: item.slashCommand?.name,
                sessionId: item.sessionId,
                requestId: item.requestId,
                result: item.result,
                action: {
                    kind: 'bug',
                },
            });
        }
    });
    registerAction2(class RetryChatAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.retry',
                title: localize2('chat.retry.label', 'Retry'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.refresh,
                menu: [
                    {
                        id: MenuId.ChatMessageFooter,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ChatContextKeys.isResponse, ContextKeyExpr.in(ChatContextKeys.itemId.key, ChatContextKeys.lastItemId.key)),
                    },
                    {
                        id: MenuId.ChatEditingWidgetToolbar,
                        group: 'navigation',
                        when: applyingChatEditsFailedContextKey,
                        order: 0,
                    },
                ],
            });
        }
        async run(accessor, ...args) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            let item = args[0];
            if (isChatEditingActionContext(item)) {
                // Resolve chat editing action context to the last response VM
                item = chatWidgetService
                    .getWidgetBySessionId(item.sessionId)
                    ?.viewModel?.getItems()
                    .at(-1);
            }
            if (!isResponseVM(item)) {
                return;
            }
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(item.sessionId);
            const chatRequests = chatModel?.getRequests();
            if (!chatRequests) {
                return;
            }
            const itemIndex = chatRequests?.findIndex((request) => request.id === item.requestId);
            const widget = chatWidgetService.getWidgetBySessionId(item.sessionId);
            const mode = widget?.input.currentMode;
            if (chatModel?.initialLocation === ChatAgentLocation.EditingSession ||
                (chatModel && (mode === ChatMode.Edit || mode === ChatMode.Agent))) {
                const configurationService = accessor.get(IConfigurationService);
                const dialogService = accessor.get(IDialogService);
                const currentEditingSession = widget?.viewModel?.model.editingSession;
                if (!currentEditingSession) {
                    return;
                }
                // Prompt if the last request modified the working set and the user hasn't already disabled the dialog
                const entriesModifiedInLastRequest = currentEditingSession.entries
                    .get()
                    .filter((entry) => entry.lastModifyingRequestId === item.requestId);
                const shouldPrompt = entriesModifiedInLastRequest.length > 0 &&
                    configurationService.getValue('chat.editing.confirmEditRequestRetry') === true;
                const confirmation = shouldPrompt
                    ? await dialogService.confirm({
                        title: localize('chat.retryLast.confirmation.title2', 'Do you want to retry your last request?'),
                        message: entriesModifiedInLastRequest.length === 1
                            ? localize('chat.retry.confirmation.message2', 'This will undo edits made to {0} since this request.', basename(entriesModifiedInLastRequest[0].modifiedURI))
                            : localize('chat.retryLast.confirmation.message2', 'This will undo edits made to {0} files in your working set since this request. Do you want to proceed?', entriesModifiedInLastRequest.length),
                        primaryButton: localize('chat.retry.confirmation.primaryButton', 'Yes'),
                        checkbox: {
                            label: localize('chat.retry.confirmation.checkbox', "Don't ask again"),
                            checked: false,
                        },
                        type: 'info',
                    })
                    : { confirmed: true };
                if (!confirmation.confirmed) {
                    return;
                }
                if (confirmation.checkboxChecked) {
                    await configurationService.updateValue('chat.editing.confirmEditRequestRetry', false);
                }
                // Reset the snapshot to the first stop (undefined undo index)
                const snapshotRequest = chatRequests[itemIndex];
                if (snapshotRequest) {
                    await currentEditingSession.restoreSnapshot(snapshotRequest.id, undefined);
                }
            }
            const request = chatModel
                ?.getRequests()
                .find((candidate) => candidate.id === item.requestId);
            const languageModelId = widget?.input.currentLanguageModel;
            const userSelectedTools = widget?.input.currentMode === ChatMode.Agent
                ? widget.input.selectedToolsModel.tools.get().map((tool) => tool.id)
                : undefined;
            chatService.resendRequest(request, {
                userSelectedModelId: languageModelId,
                userSelectedTools,
                attempt: (request?.attempt ?? -1) + 1,
                mode: widget?.input.currentMode,
            });
        }
    });
    registerAction2(class InsertToNotebookAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.insertIntoNotebook',
                title: localize2('interactive.insertIntoNotebook.label', 'Insert into Notebook'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.insert,
                menu: {
                    id: MenuId.ChatMessageFooter,
                    group: 'navigation',
                    isHiddenByDefault: true,
                    when: ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, ChatContextKeys.isResponse, ChatContextKeys.responseIsFiltered.negate()),
                },
            });
        }
        async run(accessor, ...args) {
            const item = args[0];
            if (!isResponseVM(item)) {
                return;
            }
            const editorService = accessor.get(IEditorService);
            if (editorService.activeEditorPane?.getId() === NOTEBOOK_EDITOR_ID) {
                const notebookEditor = editorService.activeEditorPane.getControl();
                if (!notebookEditor.hasModel()) {
                    return;
                }
                if (notebookEditor.isReadOnly) {
                    return;
                }
                const value = item.response.toString();
                const splitContents = splitMarkdownAndCodeBlocks(value);
                const focusRange = notebookEditor.getFocus();
                const index = Math.max(focusRange.end, 0);
                const bulkEditService = accessor.get(IBulkEditService);
                await bulkEditService.apply([
                    new ResourceNotebookCellEdit(notebookEditor.textModel.uri, {
                        editType: 1 /* CellEditType.Replace */,
                        index: index,
                        count: 0,
                        cells: splitContents.map((content) => {
                            const kind = content.type === 'markdown' ? CellKind.Markup : CellKind.Code;
                            const language = content.type === 'markdown' ? 'markdown' : content.language;
                            const mime = content.type === 'markdown' ? 'text/markdown' : `text/x-${content.language}`;
                            return {
                                cellKind: kind,
                                language,
                                mime,
                                source: content.content,
                                outputs: [],
                                metadata: {},
                            };
                        }),
                    }),
                ], { quotableLabel: 'Insert into Notebook' });
            }
        }
    });
    registerAction2(class RemoveAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.remove',
                title: localize2('chat.removeRequest.label', 'Remove Request'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.x,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                keybinding: {
                    primary: 20 /* KeyCode.Delete */,
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                    },
                    when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate()),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                },
                menu: {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 2,
                    when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), ChatContextKeys.isRequest, ChatContextKeyExprs.unifiedChatEnabled.negate()),
                },
            });
        }
        run(accessor, ...args) {
            let item = args[0];
            if (!isRequestVM(item)) {
                const chatWidgetService = accessor.get(IChatWidgetService);
                const widget = chatWidgetService.lastFocusedWidget;
                item = widget?.getFocus();
            }
            if (!item) {
                return;
            }
            const chatService = accessor.get(IChatService);
            const chatModel = chatService.getSession(item.sessionId);
            if (chatModel?.initialLocation === ChatAgentLocation.EditingSession) {
                return;
            }
            const requestId = isRequestVM(item)
                ? item.id
                : isResponseVM(item)
                    ? item.requestId
                    : undefined;
            if (requestId) {
                const chatService = accessor.get(IChatService);
                chatService.removeRequest(item.sessionId, requestId);
            }
        }
    });
    registerAction2(class ContinueEditingAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.startEditing',
                title: localize2('chat.startEditing.label2', 'Edit with Copilot'),
                f1: false,
                category: CHAT_CATEGORY,
                icon: Codicon.goToEditingSession,
                precondition: ContextKeyExpr.and(ChatContextKeys.editingParticipantRegistered, ChatContextKeys.requestInProgress.toNegated(), ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                menu: {
                    id: MenuId.ChatMessageFooter,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.isResponse, ChatContextKeys.editingParticipantRegistered, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Panel), ChatContextKeyExprs.unifiedChatEnabled.negate()),
                },
            });
        }
        async run(accessor, ...args) {
            const logService = accessor.get(ILogService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatService = accessor.get(IChatService);
            const chatAgentService = accessor.get(IChatAgentService);
            const viewsService = accessor.get(IViewsService);
            const chatEditingService = accessor.get(IChatEditingService);
            const quickPickService = accessor.get(IQuickInputService);
            const editAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.EditingSession);
            if (!editAgent) {
                logService.trace('[CHAT_MOVE] No edit agent found');
                return;
            }
            const sourceWidget = chatWidgetService.lastFocusedWidget;
            if (!sourceWidget || !sourceWidget.viewModel) {
                logService.trace('[CHAT_MOVE] NO source model');
                return;
            }
            const sourceModel = sourceWidget.viewModel.model;
            let sourceRequests = sourceModel.getRequests().slice();
            // when a response is passed (clicked on) ignore all item after it
            const [first] = args;
            if (isResponseVM(first)) {
                const idx = sourceRequests.findIndex((candidate) => candidate.id === first.requestId);
                if (idx >= 0) {
                    sourceRequests.length = idx + 1;
                }
            }
            // when having multiple turns, let the user pick
            if (sourceRequests.length > 1) {
                sourceRequests = await this._pickTurns(quickPickService, sourceRequests);
            }
            if (sourceRequests.length === 0) {
                logService.trace('[CHAT_MOVE] NO requests to move');
                return;
            }
            const editsView = await viewsService.openView(EditsViewId);
            if (!(editsView instanceof ChatViewPane)) {
                return;
            }
            const viewModelObs = observableFromEvent(this, editsView.widget.onDidChangeViewModel, () => editsView.widget.viewModel);
            const chatSessionId = (await waitForState(viewModelObs)).sessionId;
            const editingSession = chatEditingService.getEditingSession(chatSessionId);
            if (!editingSession) {
                return;
            }
            const state = editingSession.state.get();
            if (state === 3 /* ChatEditingSessionState.Disposed */) {
                return;
            }
            // adopt request items and collect new working set entries
            const workingSetAdditions = new ResourceSet();
            for (const request of sourceRequests) {
                await chatService.adoptRequest(editingSession.chatSessionId, request);
                this._collectWorkingSetAdditions(request, workingSetAdditions);
            }
            await Promise.all(Array.from(workingSetAdditions, async (uri) => editsView.widget.attachmentModel.addFile(uri)));
            // make request
            await chatService.sendRequest(editingSession.chatSessionId, '', {
                agentId: editAgent.id,
                acceptedConfirmationData: [
                    {
                        _type: 'toEditTransfer',
                        transferredTurnResults: sourceRequests.map((v) => v.response?.result),
                    },
                ], // TODO@jrieken HACKY
                confirmation: typeof this.desc.title === 'string' ? this.desc.title : this.desc.title.value,
            });
        }
        _collectWorkingSetAdditions(request, bucket) {
            for (const item of request.response?.response.value ?? []) {
                if (item.kind === 'inlineReference') {
                    bucket.add(isLocation(item.inlineReference)
                        ? item.inlineReference.uri
                        : URI.isUri(item.inlineReference)
                            ? item.inlineReference
                            : item.inlineReference.location.uri);
                }
            }
        }
        async _pickTurns(quickPickService, requests) {
            const timeThreshold = 2 * 60000; // 2 minutes
            const lastRequestTimestamp = requests[requests.length - 1].timestamp;
            const relatedRequests = requests.filter((request) => request.timestamp >= 0 && lastRequestTimestamp - request.timestamp <= timeThreshold);
            const lastPick = {
                label: localize('chat.startEditing.last', 'The last {0} requests', relatedRequests.length),
                detail: relatedRequests.map((req) => req.message.text).join(', '),
            };
            const allPick = {
                label: localize('chat.startEditing.pickAll', 'All requests from the conversation'),
            };
            const customPick = {
                label: localize('chat.startEditing.pickCustom', 'Manually select requests...'),
            };
            const picks = relatedRequests.length !== 0 ? [lastPick, allPick, customPick] : [allPick, customPick];
            const firstPick = await quickPickService.pick(picks, {
                placeHolder: localize('chat.startEditing.pickRequest', 'Select requests that you want to use for editing'),
            });
            if (!firstPick) {
                return [];
            }
            else if (firstPick === allPick) {
                return requests;
            }
            else if (firstPick === lastPick) {
                return relatedRequests;
            }
            const customPicks = requests.map((request) => ({
                picked: false,
                request: request,
                label: request.message.text,
                detail: request.response?.response.toString(),
            }));
            return await new Promise((_resolve) => {
                const resolve = (value) => {
                    store.dispose();
                    _resolve(value);
                    qp.hide();
                };
                const store = new DisposableStore();
                const qp = quickPickService.createQuickPick();
                qp.placeholder = localize('chat.startEditing.pickRequest', 'Select requests that you want to use for editing');
                qp.canSelectMany = true;
                qp.items = customPicks;
                let ignore = false;
                store.add(qp.onDidChangeSelection((e) => {
                    if (ignore) {
                        return;
                    }
                    ignore = true;
                    try {
                        const [first] = e;
                        const selected = [];
                        let disabled = false;
                        for (let i = 0; i < customPicks.length; i++) {
                            const oldItem = customPicks[i];
                            customPicks[i] = {
                                ...oldItem,
                                disabled,
                            };
                            disabled = disabled || oldItem === first;
                            if (disabled) {
                                selected.push(customPicks[i]);
                            }
                        }
                        qp.items = customPicks;
                        qp.selectedItems = selected;
                    }
                    finally {
                        ignore = false;
                    }
                }));
                store.add(qp.onDidAccept((_e) => resolve(qp.selectedItems.map((i) => i.request))));
                store.add(qp.onDidHide((_) => resolve([])));
                store.add(qp);
                qp.show();
            });
        }
    });
}
function splitMarkdownAndCodeBlocks(markdown) {
    const lexer = new marked.Lexer();
    const tokens = lexer.lex(markdown);
    const splitContent = [];
    let markdownPart = '';
    tokens.forEach((token) => {
        if (token.type === 'code') {
            if (markdownPart.trim()) {
                splitContent.push({ type: 'markdown', content: markdownPart });
                markdownPart = '';
            }
            splitContent.push({
                type: 'code',
                language: token.lang || '',
                content: token.text,
            });
        }
        else {
            markdownPart += token.raw;
        }
    });
    if (markdownPart.trim()) {
        splitContent.push({ type: 'markdown', content: markdownPart });
    }
    return splitContent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRpdGxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdFRpdGxlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVsRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0s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