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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRpdGxlQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRUaXRsZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxZQUFZLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFbEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEy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