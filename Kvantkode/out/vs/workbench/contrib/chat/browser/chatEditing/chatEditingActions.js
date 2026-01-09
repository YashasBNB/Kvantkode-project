/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { basename } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IListService } from '../../../../../platform/list/browser/listService.js';
import { IEditorGroupsService, } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { isChatViewTitleActionContext } from '../../common/chatActions.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { applyingChatEditsFailedContextKey, CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME, chatEditingResourceContextKey, chatEditingWidgetFileStateContextKey, decidedChatEditingResourceContextKey, hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey, IChatEditingService, } from '../../common/chatEditingService.js';
import { IChatService } from '../../common/chatService.js';
import { isRequestVM, isResponseVM } from '../../common/chatViewModel.js';
import { ChatAgentLocation, ChatMode } from '../../common/constants.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { IChatWidgetService } from '../chat.js';
export class EditingSessionAction extends Action2 {
    constructor(opts) {
        super({
            category: CHAT_CATEGORY,
            ...opts,
        });
    }
    run(accessor, ...args) {
        const context = getEditingSessionContext(accessor, args);
        if (!context || !context.editingSession) {
            return;
        }
        return this.runEditingSessionAction(accessor, context.editingSession, context.chatWidget, ...args);
    }
}
export function getEditingSessionContext(accessor, args) {
    const arg0 = args.at(0);
    const context = isChatViewTitleActionContext(arg0) ? arg0 : undefined;
    const chatService = accessor.get(IChatService);
    const chatWidgetService = accessor.get(IChatWidgetService);
    const chatEditingService = accessor.get(IChatEditingService);
    let chatWidget = context ? chatWidgetService.getWidgetBySessionId(context.sessionId) : undefined;
    if (!chatWidget) {
        if (chatService.unifiedViewEnabled) {
            // TODO ugly
            chatWidget =
                chatWidgetService.lastFocusedWidget ??
                    chatWidgetService
                        .getWidgetsByLocations(ChatAgentLocation.Panel)
                        .find((w) => w.isUnifiedPanelWidget);
        }
        else {
            chatWidget = chatWidgetService.getWidgetsByLocations(ChatAgentLocation.EditingSession).at(0);
        }
    }
    if (!chatWidget?.viewModel) {
        return;
    }
    const chatSessionId = chatWidget.viewModel.model.sessionId;
    const editingSession = chatEditingService.getEditingSession(chatSessionId);
    if (!editingSession) {
        return;
    }
    return { editingSession, chatWidget };
}
class WorkingSetAction extends EditingSessionAction {
    runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        const uris = [];
        if (URI.isUri(args[0])) {
            uris.push(args[0]);
        }
        else if (chatWidget) {
            uris.push(...chatWidget.input.selectedElements);
        }
        if (!uris.length) {
            return;
        }
        return this.runWorkingSetAction(accessor, editingSession, chatWidget, ...uris);
    }
}
registerAction2(class RemoveFileFromWorkingSet extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.removeFileFromWorkingSet',
            title: localize2('removeFileFromWorkingSet', 'Remove File'),
            icon: Codicon.close,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [
                {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    // when: ContextKeyExpr.or(ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Attached), ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Suggested), ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, WorkingSetEntryState.Transient)),
                    order: 5,
                    group: 'navigation',
                },
            ],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        const dialogService = accessor.get(IDialogService);
        const pendingEntries = currentEditingSession.entries
            .get()
            .filter((entry) => uris.includes(entry.modifiedURI) && entry.state.get() === 0 /* WorkingSetEntryState.Modified */);
        if (pendingEntries.length > 0) {
            // Ask for confirmation if there are any pending edits
            const file = pendingEntries.length > 1
                ? localize('chat.editing.removeFile.confirmationmanyFiles', '{0} files', pendingEntries.length)
                : basename(pendingEntries[0].modifiedURI);
            const confirmation = await dialogService.confirm({
                title: localize('chat.editing.removeFile.confirmation.title', 'Remove {0} from working set?', file),
                message: localize('chat.editing.removeFile.confirmation.message', 'This will remove {0} from your working set and undo the edits made to it. Do you want to proceed?', file),
                primaryButton: localize('chat.editing.removeFile.confirmation.primaryButton', 'Yes'),
                type: 'info',
            });
            if (!confirmation.confirmed) {
                return;
            }
        }
        // Remove from working set
        await currentEditingSession.reject(...uris);
        currentEditingSession.remove(0 /* WorkingSetEntryRemovalReason.User */, ...uris);
        // Remove from chat input part
        for (const uri of uris) {
            chatWidget.attachmentModel.delete(uri.toString());
        }
        // Clear all related file suggestions
        if (chatWidget.attachmentModel.fileAttachments.length === 0) {
            chatWidget.input.relatedFiles?.clear();
        }
    }
});
registerAction2(class OpenFileInDiffAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.openFileInDiff',
            title: localize2('open.fileInDiff', 'Open Changes in Diff Editor'),
            icon: Codicon.diffSingle,
            menu: [
                {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 2,
                    group: 'navigation',
                },
            ],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, _chatWidget, ...uris) {
        const editorService = accessor.get(IEditorService);
        for (const uri of uris) {
            const editedFile = currentEditingSession.getEntry(uri);
            if (editedFile?.state.get() === 0 /* WorkingSetEntryState.Modified */) {
                await editorService.openEditor({
                    original: { resource: URI.from(editedFile.originalURI, true) },
                    modified: { resource: URI.from(editedFile.modifiedURI, true) },
                });
            }
            else {
                await editorService.openEditor({ resource: uri });
            }
        }
    }
});
registerAction2(class AcceptAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.acceptFile',
            title: localize2('accept.file', 'Keep'),
            icon: Codicon.check,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [
                {
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME), ContextKeyExpr.notIn(chatEditingResourceContextKey.key, decidedChatEditingResourceContextKey.key)),
                    id: MenuId.MultiDiffEditorFileToolbar,
                    order: 0,
                    group: 'navigation',
                },
                {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 0,
                    group: 'navigation',
                },
            ],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        await currentEditingSession.accept(...uris);
    }
});
registerAction2(class DiscardAction extends WorkingSetAction {
    constructor() {
        super({
            id: 'chatEditing.discardFile',
            title: localize2('discard.file', 'Undo'),
            icon: Codicon.discard,
            precondition: ChatContextKeys.requestInProgress.negate(),
            menu: [
                {
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('resourceScheme', CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME), ContextKeyExpr.notIn(chatEditingResourceContextKey.key, decidedChatEditingResourceContextKey.key)),
                    id: MenuId.MultiDiffEditorFileToolbar,
                    order: 2,
                    group: 'navigation',
                },
                {
                    id: MenuId.ChatEditingWidgetModifiedFilesToolbar,
                    when: ContextKeyExpr.equals(chatEditingWidgetFileStateContextKey.key, 0 /* WorkingSetEntryState.Modified */),
                    order: 1,
                    group: 'navigation',
                },
            ],
        });
    }
    async runWorkingSetAction(accessor, currentEditingSession, chatWidget, ...uris) {
        await currentEditingSession.reject(...uris);
    }
});
export class ChatEditingAcceptAllAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'chatEditing.acceptAllFiles',
            title: localize('accept', 'Keep'),
            icon: Codicon.check,
            tooltip: localize('acceptAllEdits', 'Keep All Edits'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey, ChatContextKeys.inChatInput),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 0,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), ContextKeyExpr.and(hasUndecidedChatEditingResourceContextKey)),
                },
            ],
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await editingSession.accept();
    }
}
registerAction2(ChatEditingAcceptAllAction);
export class ChatEditingDiscardAllAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'chatEditing.discardAllFiles',
            title: localize('discard', 'Undo'),
            icon: Codicon.discard,
            tooltip: localize('discardAllEdits', 'Undo All Edits'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey),
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 1,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), hasUndecidedChatEditingResourceContextKey),
                },
            ],
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate(), hasUndecidedChatEditingResourceContextKey, ChatContextKeys.inChatInput, ChatContextKeys.inputHasText.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
            },
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await discardAllEditsWithConfirmation(accessor, editingSession);
    }
}
registerAction2(ChatEditingDiscardAllAction);
export async function discardAllEditsWithConfirmation(accessor, currentEditingSession) {
    const dialogService = accessor.get(IDialogService);
    // Ask for confirmation if there are any edits
    const entries = currentEditingSession.entries.get();
    if (entries.length > 0) {
        const confirmation = await dialogService.confirm({
            title: localize('chat.editing.discardAll.confirmation.title', 'Undo all edits?'),
            message: entries.length === 1
                ? localize('chat.editing.discardAll.confirmation.oneFile', 'This will undo changes made by {0} in {1}. Do you want to proceed?', 'Copilot Edits', basename(entries[0].modifiedURI))
                : localize('chat.editing.discardAll.confirmation.manyFiles', 'This will undo changes made by {0} in {1} files. Do you want to proceed?', 'Copilot Edits', entries.length),
            primaryButton: localize('chat.editing.discardAll.confirmation.primaryButton', 'Yes'),
            type: 'info',
        });
        if (!confirmation.confirmed) {
            return false;
        }
    }
    await currentEditingSession.reject();
    return true;
}
export class ChatEditingRemoveAllFilesAction extends EditingSessionAction {
    static { this.ID = 'chatEditing.clearWorkingSet'; }
    constructor() {
        super({
            id: ChatEditingRemoveAllFilesAction.ID,
            title: localize('clearWorkingSet', 'Clear Working Set'),
            icon: Codicon.clearAll,
            tooltip: localize('clearWorkingSet', 'Clear Working Set'),
            precondition: ContextKeyExpr.and(ChatContextKeys.requestInProgress.negate()),
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 5,
                    when: hasAppliedChatEditsContextKey.negate(),
                },
            ],
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        // Remove all files from working set
        const uris = [...editingSession.entries.get()].map((e) => e.modifiedURI);
        editingSession.remove(0 /* WorkingSetEntryRemovalReason.User */, ...uris);
        // Remove all file attachments
        const fileAttachments = chatWidget.attachmentModel
            ? chatWidget.attachmentModel.fileAttachments
            : [];
        const attachmentIdsToRemove = fileAttachments.map((attachment) => attachment.toString());
        chatWidget.attachmentModel.delete(...attachmentIdsToRemove);
    }
}
registerAction2(ChatEditingRemoveAllFilesAction);
export class ChatEditingShowChangesAction extends EditingSessionAction {
    static { this.ID = 'chatEditing.viewChanges'; }
    static { this.LABEL = localize('chatEditing.viewChanges', 'View All Edits'); }
    constructor() {
        super({
            id: ChatEditingShowChangesAction.ID,
            title: ChatEditingShowChangesAction.LABEL,
            tooltip: ChatEditingShowChangesAction.LABEL,
            f1: false,
            icon: Codicon.diffMultiple,
            precondition: hasUndecidedChatEditingResourceContextKey,
            menu: [
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey.negate(), ContextKeyExpr.and(hasAppliedChatEditsContextKey, hasUndecidedChatEditingResourceContextKey)),
                },
            ],
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        await editingSession.show();
    }
}
registerAction2(ChatEditingShowChangesAction);
registerAction2(class AddFilesToWorkingSetAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'workbench.action.chat.addSelectedFilesToWorkingSet',
            title: localize2('workbench.action.chat.addSelectedFilesToWorkingSet.label', 'Add Selected Files to Working Set'),
            icon: Codicon.attach,
            precondition: ChatContextKeys.location.isEqualTo(ChatAgentLocation.EditingSession),
            f1: true,
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        const listService = accessor.get(IListService);
        const editorGroupService = accessor.get(IEditorGroupsService);
        const uris = [];
        for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
            for (const selection of group.selectedEditors) {
                if (selection.resource) {
                    uris.push(selection.resource);
                }
            }
        }
        if (uris.length === 0) {
            const selection = listService.lastFocusedList?.getSelection();
            if (selection?.length) {
                for (const file of selection) {
                    if (!!file &&
                        typeof file === 'object' &&
                        'resource' in file &&
                        URI.isUri(file.resource)) {
                        uris.push(file.resource);
                    }
                }
            }
        }
        for (const file of uris) {
            await chatWidget.attachmentModel.addFile(file);
        }
    }
});
registerAction2(class RemoveAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.undoEdits',
            title: localize2('chat.undoEdits.label', 'Undo Requests'),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.x,
            keybinding: {
                primary: 20 /* KeyCode.Delete */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
                },
                when: ContextKeyExpr.and(ChatContextKeys.inChatSession, EditorContextKeys.textInputFocus.negate()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
            },
            menu: [
                {
                    id: MenuId.ChatMessageTitle,
                    group: 'navigation',
                    order: 2,
                    when: ChatContextKeys.isRequest,
                },
            ],
        });
    }
    async run(accessor, ...args) {
        let item = args[0];
        if (!isResponseVM(item) && !isRequestVM(item)) {
            const chatWidgetService = accessor.get(IChatWidgetService);
            const widget = chatWidgetService.lastFocusedWidget;
            item = widget?.getFocus();
        }
        if (!item) {
            return;
        }
        const configurationService = accessor.get(IConfigurationService);
        const dialogService = accessor.get(IDialogService);
        const chatService = accessor.get(IChatService);
        const chatModel = chatService.getSession(item.sessionId);
        if (!chatModel) {
            return;
        }
        const session = chatModel.editingSession;
        if (!session) {
            return;
        }
        const requestId = isRequestVM(item)
            ? item.id
            : isResponseVM(item)
                ? item.requestId
                : undefined;
        if (requestId) {
            const chatRequests = chatModel.getRequests();
            const itemIndex = chatRequests.findIndex((request) => request.id === requestId);
            const editsToUndo = chatRequests.length - itemIndex;
            const requestsToRemove = chatRequests.slice(itemIndex);
            const requestIdsToRemove = new Set(requestsToRemove.map((request) => request.id));
            const entriesModifiedInRequestsToRemove = session.entries
                .get()
                .filter((entry) => requestIdsToRemove.has(entry.lastModifyingRequestId)) ?? [];
            const shouldPrompt = entriesModifiedInRequestsToRemove.length > 0 &&
                configurationService.getValue('chat.editing.confirmEditRequestRemoval') === true;
            let message;
            if (editsToUndo === 1) {
                if (entriesModifiedInRequestsToRemove.length === 1) {
                    message = localize('chat.removeLast.confirmation.message2', 'This will remove your last request and undo the edits made to {0}. Do you want to proceed?', basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                }
                else {
                    message = localize('chat.removeLast.confirmation.multipleEdits.message', 'This will remove your last request and undo edits made to {0} files in your working set. Do you want to proceed?', entriesModifiedInRequestsToRemove.length);
                }
            }
            else {
                if (entriesModifiedInRequestsToRemove.length === 1) {
                    message = localize('chat.remove.confirmation.message2', 'This will remove all subsequent requests and undo edits made to {0}. Do you want to proceed?', basename(entriesModifiedInRequestsToRemove[0].modifiedURI));
                }
                else {
                    message = localize('chat.remove.confirmation.multipleEdits.message', 'This will remove all subsequent requests and undo edits made to {0} files in your working set. Do you want to proceed?', entriesModifiedInRequestsToRemove.length);
                }
            }
            const confirmation = shouldPrompt
                ? await dialogService.confirm({
                    title: editsToUndo === 1
                        ? localize('chat.removeLast.confirmation.title', 'Do you want to undo your last edit?')
                        : localize('chat.remove.confirmation.title', 'Do you want to undo {0} edits?', editsToUndo),
                    message: message,
                    primaryButton: localize('chat.remove.confirmation.primaryButton', 'Yes'),
                    checkbox: {
                        label: localize('chat.remove.confirmation.checkbox', "Don't ask again"),
                        checked: false,
                    },
                    type: 'info',
                })
                : { confirmed: true };
            if (!confirmation.confirmed) {
                return;
            }
            if (confirmation.checkboxChecked) {
                await configurationService.updateValue('chat.editing.confirmEditRequestRemoval', false);
            }
            // Restore the snapshot to what it was before the request(s) that we deleted
            const snapshotRequestId = chatRequests[itemIndex].id;
            await session.restoreSnapshot(snapshotRequestId, undefined);
        }
    }
});
registerAction2(class OpenWorkingSetHistoryAction extends Action2 {
    static { this.id = 'chat.openFileUpdatedBySnapshot'; }
    constructor() {
        super({
            id: OpenWorkingSetHistoryAction.id,
            title: localize('chat.openFileUpdatedBySnapshot.label', 'Open File'),
            menu: [
                {
                    id: MenuId.ChatEditingCodeBlockContext,
                    group: 'navigation',
                    order: 0,
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!context?.sessionId) {
            return;
        }
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({ resource: context.uri });
    }
});
registerAction2(class OpenWorkingSetHistoryAction extends Action2 {
    static { this.id = 'chat.openFileSnapshot'; }
    constructor() {
        super({
            id: OpenWorkingSetHistoryAction.id,
            title: localize('chat.openSnapshot.label', 'Open File Snapshot'),
            menu: [
                {
                    id: MenuId.ChatEditingCodeBlockContext,
                    group: 'navigation',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!context?.sessionId) {
            return;
        }
        const chatService = accessor.get(IChatService);
        const chatEditingService = accessor.get(IChatEditingService);
        const editorService = accessor.get(IEditorService);
        const chatModel = chatService.getSession(context.sessionId);
        if (!chatModel) {
            return;
        }
        const snapshot = chatEditingService
            .getEditingSession(chatModel.sessionId)
            ?.getSnapshotUri(context.requestId, context.uri, context.stopId);
        if (snapshot) {
            const editor = await editorService.openEditor({
                resource: snapshot,
                label: localize('chatEditing.snapshot', '{0} (Snapshot)', basename(context.uri)),
                options: { transient: true, activation: EditorActivation.ACTIVATE },
            });
            if (isCodeEditor(editor)) {
                editor.updateOptions({ readOnly: true });
            }
        }
    }
});
registerAction2(class ResolveSymbolsContextAction extends EditingSessionAction {
    constructor() {
        super({
            id: 'workbench.action.edits.addFilesFromReferences',
            title: localize2('addFilesFromReferences', 'Add Files From References'),
            f1: false,
            category: CHAT_CATEGORY,
            menu: {
                id: MenuId.ChatInputSymbolAttachmentContext,
                group: 'navigation',
                order: 1,
                when: ContextKeyExpr.and(ChatContextKeys.chatMode.isEqualTo(ChatMode.Ask), EditorContextKeys.hasReferenceProvider),
            },
        });
    }
    async runEditingSessionAction(accessor, editingSession, chatWidget, ...args) {
        if (args.length === 0 || !isLocation(args[0])) {
            return;
        }
        const textModelService = accessor.get(ITextModelService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const symbol = args[0];
        const modelReference = await textModelService.createModelReference(symbol.uri);
        const textModel = modelReference.object.textEditorModel;
        if (!textModel) {
            return;
        }
        const position = new Position(symbol.range.startLineNumber, symbol.range.startColumn);
        const [references, definitions, implementations] = await Promise.all([
            this.getReferences(position, textModel, languageFeaturesService),
            this.getDefinitions(position, textModel, languageFeaturesService),
            this.getImplementations(position, textModel, languageFeaturesService),
        ]);
        // Sort the references, definitions and implementations by
        // how important it is that they make it into the working set as it has limited size
        const attachments = [];
        for (const reference of [...definitions, ...implementations, ...references]) {
            attachments.push(chatWidget.attachmentModel.asVariableEntry(reference.uri));
        }
        chatWidget.attachmentModel.addContext(...attachments);
    }
    async getReferences(position, textModel, languageFeaturesService) {
        const referenceProviders = languageFeaturesService.referenceProvider.all(textModel);
        const references = await Promise.all(referenceProviders.map(async (referenceProvider) => {
            return ((await referenceProvider.provideReferences(textModel, position, { includeDeclaration: true }, CancellationToken.None)) ?? []);
        }));
        return references.flat();
    }
    async getDefinitions(position, textModel, languageFeaturesService) {
        const definitionProviders = languageFeaturesService.definitionProvider.all(textModel);
        const definitions = await Promise.all(definitionProviders.map(async (definitionProvider) => {
            return ((await definitionProvider.provideDefinition(textModel, position, CancellationToken.None)) ?? []);
        }));
        return definitions.flat();
    }
    async getImplementations(position, textModel, languageFeaturesService) {
        const implementationProviders = languageFeaturesService.implementationProvider.all(textModel);
        const implementations = await Promise.all(implementationProviders.map(async (implementationProvider) => {
            return ((await implementationProvider.provideImplementation(textModel, position, CancellationToken.None)) ?? []);
        }));
        return implementations.flat();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFVBQVUsRUFBWSxNQUFNLDJDQUEyQyxDQUFBO0FBRWhGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUNOLE9BQU8sRUFFUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8s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