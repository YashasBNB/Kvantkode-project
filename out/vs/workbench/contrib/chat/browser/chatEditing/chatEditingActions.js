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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxVQUFVLEVBQVksTUFBTSwyQ0FBMkMsQ0FBQTtBQUVoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFDTixPQUFPLEVBRVAsTUFBTSxFQUNOLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURB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