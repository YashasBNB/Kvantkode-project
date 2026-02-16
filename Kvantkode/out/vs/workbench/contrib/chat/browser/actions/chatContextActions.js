/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { compare } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { AbstractGotoSymbolQuickAccessProvider, } from '../../../../../editor/contrib/quickAccess/browser/gotoSymbolQuickAccess.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2, } from '../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { ActiveEditorContext, TextCompareEditorActiveContext, } from '../../../../common/contextkeys.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { VIEW_ID as SEARCH_VIEW_ID } from '../../../../services/search/common/search.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { TEXT_FILE_EDITOR_ID } from '../../../files/common/files.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { AnythingQuickAccessProvider } from '../../../search/browser/anythingQuickAccess.js';
import { isSearchTreeFileMatch, isSearchTreeMatch, } from '../../../search/browser/searchTreeModel/searchTreeCommon.js';
import { SymbolsQuickAccessProvider, } from '../../../search/browser/symbolsQuickAccess.js';
import { SearchContext } from '../../../search/common/constants.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { IDiagnosticVariableEntryFilterData, } from '../../common/chatModel.js';
import { ChatRequestAgentPart } from '../../common/chatParserTypes.js';
import { IChatVariablesService } from '../../common/chatVariables.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { IChatWidgetService, IQuickChatService, showChatView, showEditsView, } from '../chat.js';
import { imageToHash, isImage } from '../chatPasteProviders.js';
import { isQuickChat } from '../chatWidget.js';
import { createFolderQuickPick, createMarkersQuickPick } from '../contrib/chatDynamicVariables.js';
import { convertBufferToScreenshotVariable, ScreenshotVariableId } from '../contrib/screenshot.js';
import { resizeImage } from '../imageUtils.js';
import { COMMAND_ID as USE_PROMPT_COMMAND_ID } from '../promptSyntax/contributions/usePromptCommand.js';
import { CHAT_CATEGORY } from './chatActions.js';
import { ATTACH_PROMPT_ACTION_ID, AttachPromptAction, } from './chatAttachPromptAction/chatAttachPromptAction.js';
export function registerChatContextActions() {
    registerAction2(AttachContextAction);
    registerAction2(AttachFileToChatAction);
    registerAction2(AttachFolderToChatAction);
    registerAction2(AttachSelectionToChatAction);
    registerAction2(AttachFileToEditingSessionAction);
    registerAction2(AttachFolderToEditingSessionAction);
    registerAction2(AttachSelectionToEditingSessionAction);
    registerAction2(AttachSearchResultAction);
}
function isIGotoSymbolQuickPickItem(obj) {
    return (typeof obj === 'object' &&
        typeof obj.symbolName === 'string' &&
        !!obj.uri &&
        !!obj.range);
}
function isISymbolQuickPickItem(obj) {
    return (typeof obj === 'object' &&
        typeof obj.symbol === 'object' &&
        !!obj.symbol);
}
function isIFolderSearchResultQuickPickItem(obj) {
    return (typeof obj === 'object' && obj.kind === 'folder-search-result');
}
function isIDiagnosticsQuickPickItemWithFilter(obj) {
    return (typeof obj === 'object' &&
        obj.kind === 'diagnostic-filter');
}
function isIQuickPickItemWithResource(obj) {
    return (typeof obj === 'object' &&
        typeof obj.resource === 'object' &&
        URI.isUri(obj.resource));
}
function isIOpenEditorsQuickPickItem(obj) {
    return typeof obj === 'object' && obj.id === 'open-editors';
}
function isISearchResultsQuickPickItem(obj) {
    return typeof obj === 'object' && obj.kind === 'search-results';
}
function isScreenshotQuickPickItem(obj) {
    return typeof obj === 'object' && obj.kind === 'screenshot';
}
function isRelatedFileQuickPickItem(obj) {
    return typeof obj === 'object' && obj.kind === 'related-files';
}
/**
 * Checks is a provided object is a prompt instructions quick pick item.
 */
function isPromptInstructionsQuickPickItem(obj) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    return 'kind' in obj && obj.kind === 'reusable-prompt';
}
/**
 * Quick pick item for reusable prompt attachment.
 */
const REUSABLE_PROMPT_PICK_ID = 'reusable-prompt';
class AttachResourceAction extends Action2 {
    getResources(accessor, ...args) {
        const editorService = accessor.get(IEditorService);
        const contexts = Array.isArray(args[1]) ? args[1] : [args[0]];
        const files = [];
        for (const context of contexts) {
            let uri;
            if (URI.isUri(context)) {
                uri = context;
            }
            else if (isSearchTreeFileMatch(context)) {
                uri = context.resource;
            }
            else if (isSearchTreeMatch(context)) {
                uri = context.parent().resource;
            }
            else if (!context && editorService.activeTextEditorControl) {
                uri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, {
                    supportSideBySide: SideBySideEditor.PRIMARY,
                });
            }
            if (uri && [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(uri.scheme)) {
                files.push(uri);
            }
        }
        return files;
    }
}
class AttachFileToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFile'; }
    constructor() {
        super({
            id: AttachFileToChatAction.ID,
            title: localize2('workbench.action.chat.attachFile.label', 'Add File to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), SearchContext.SearchResultHeaderFocused.negate()),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const files = this.getResources(accessor, ...args);
        if (files.length) {
            ;
            (await showChatView(accessor.get(IViewsService)))?.focusInput();
            for (const file of files) {
                variablesService.attachContext('file', file, ChatAgentLocation.Panel);
            }
        }
    }
}
class AttachFolderToChatAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.chat.attachFolder'; }
    constructor() {
        super({
            id: AttachFolderToChatAction.ID,
            title: localize2('workbench.action.chat.attachFolder.label', 'Add Folder to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const folders = this.getResources(accessor, ...args);
        if (folders.length) {
            ;
            (await showChatView(accessor.get(IViewsService)))?.focusInput();
            for (const folder of folders) {
                variablesService.attachContext('folder', folder, ChatAgentLocation.Panel);
            }
        }
    }
}
class AttachSelectionToChatAction extends Action2 {
    static { this.ID = 'workbench.action.chat.attachSelection'; }
    constructor() {
        super({
            id: AttachSelectionToChatAction.ID,
            title: localize2('workbench.action.chat.attachSelection.label', 'Add Selection to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const editorService = accessor.get(IEditorService);
        const [_, matches] = args;
        // If we have search matches, it means this is coming from the search widget
        if (matches && matches.length > 0) {
            const uris = new Map();
            for (const match of matches) {
                if (isSearchTreeFileMatch(match)) {
                    uris.set(match.resource, undefined);
                }
                else {
                    const context = { uri: match._parent.resource, range: match._range };
                    const range = uris.get(context.uri);
                    if (!range ||
                        (range.startLineNumber !== context.range.startLineNumber &&
                            range.endLineNumber !== context.range.endLineNumber)) {
                        uris.set(context.uri, context.range);
                        variablesService.attachContext('file', context, ChatAgentLocation.Panel);
                    }
                }
            }
            // Add the root files for all of the ones that didn't have a match
            for (const uri of uris) {
                const [resource, range] = uri;
                if (!range) {
                    variablesService.attachContext('file', { uri: resource }, ChatAgentLocation.Panel);
                }
            }
        }
        else {
            const activeEditor = editorService.activeTextEditorControl;
            const activeUri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            });
            if (editorService.activeTextEditorControl &&
                activeUri &&
                [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(activeUri.scheme)) {
                const selection = activeEditor?.getSelection();
                if (selection) {
                    ;
                    (await showChatView(accessor.get(IViewsService)))?.focusInput();
                    const range = selection.isEmpty()
                        ? new Range(selection.startLineNumber, 1, selection.startLineNumber + 1, 1)
                        : selection;
                    variablesService.attachContext('file', { uri: activeUri, range }, ChatAgentLocation.Panel);
                }
            }
        }
    }
}
class AttachFileToEditingSessionAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.edits.attachFile'; }
    constructor() {
        super({
            id: AttachFileToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachFile.label', 'Add File to {0}', 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 2,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), ChatContextKeyExprs.unifiedChatEnabled.negate(), SearchContext.SearchResultHeaderFocused.negate()),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const files = this.getResources(accessor, ...args);
        if (files.length) {
            ;
            (await showEditsView(accessor.get(IViewsService)))?.focusInput();
            for (const file of files) {
                variablesService.attachContext('file', file, ChatAgentLocation.EditingSession);
            }
        }
    }
}
export class AttachSearchResultAction extends Action2 {
    static { this.Name = 'searchResults'; }
    static { this.ID = 'workbench.action.chat.insertSearchResults'; }
    constructor() {
        super({
            id: AttachSearchResultAction.ID,
            title: localize2('chat.insertSearchResults', 'Add Search Results to Chat'),
            category: CHAT_CATEGORY,
            f1: false,
            menu: [
                {
                    id: MenuId.SearchContext,
                    group: 'z_chat',
                    order: 3,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, SearchContext.SearchResultHeaderFocused),
                },
            ],
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const widget = await showChatView(accessor.get(IViewsService));
        if (!widget) {
            logService.trace('InsertSearchResultAction: no chat view available');
            return;
        }
        const editor = widget.inputEditor;
        const originalRange = editor.getSelection() ?? editor.getModel()?.getFullModelRange().collapseToEnd();
        if (!originalRange) {
            logService.trace('InsertSearchResultAction: no selection');
            return;
        }
        let insertText = `#${AttachSearchResultAction.Name}`;
        const varRange = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.startColumn + insertText.length);
        // check character before the start of the range. If it's not a space, add a space
        const model = editor.getModel();
        if (model &&
            model.getValueInRange(new Range(originalRange.startLineNumber, originalRange.startColumn - 1, originalRange.startLineNumber, originalRange.startColumn)) !== ' ') {
            insertText = ' ' + insertText;
        }
        const success = editor.executeEdits('chatInsertSearch', [
            { range: varRange, text: insertText + ' ' },
        ]);
        if (!success) {
            logService.trace(`InsertSearchResultAction: failed to insert "${insertText}"`);
            return;
        }
    }
}
class AttachFolderToEditingSessionAction extends AttachResourceAction {
    static { this.ID = 'workbench.action.edits.attachFolder'; }
    constructor() {
        super({
            id: AttachFolderToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachFolder.label', 'Add Folder to {0}', 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeyExprs.unifiedChatEnabled.negate()),
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const folders = this.getResources(accessor, ...args);
        if (folders.length) {
            ;
            (await showEditsView(accessor.get(IViewsService)))?.focusInput();
            for (const folder of folders) {
                variablesService.attachContext('folder', folder, ChatAgentLocation.EditingSession);
            }
        }
    }
}
class AttachSelectionToEditingSessionAction extends Action2 {
    static { this.ID = 'workbench.action.edits.attachSelection'; }
    constructor() {
        super({
            id: AttachSelectionToEditingSessionAction.ID,
            title: localize2('workbench.action.edits.attachSelection.label', 'Add Selection to {0}', 'Copilot Edits'),
            category: CHAT_CATEGORY,
            f1: false,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.or(ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TextCompareEditorActiveContext), ChatContextKeyExprs.unifiedChatEnabled.negate()),
        });
    }
    async run(accessor, ...args) {
        const variablesService = accessor.get(IChatVariablesService);
        const editorService = accessor.get(IEditorService);
        const activeEditor = editorService.activeTextEditorControl;
        const activeUri = EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        });
        if (editorService.activeTextEditorControl &&
            activeUri &&
            [Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(activeUri.scheme)) {
            const selection = activeEditor?.getSelection();
            if (selection) {
                ;
                (await showEditsView(accessor.get(IViewsService)))?.focusInput();
                const range = selection.isEmpty()
                    ? new Range(selection.startLineNumber, 1, selection.startLineNumber + 1, 1)
                    : selection;
                variablesService.attachContext('file', { uri: activeUri, range }, ChatAgentLocation.EditingSession);
            }
        }
    }
}
export class AttachContextAction extends Action2 {
    static { this.ID = 'workbench.action.chat.attachContext'; }
    constructor(desc = {
        id: AttachContextAction.ID,
        title: localize2('workbench.action.chat.attachContext.label.2', 'Add Context'),
        icon: Codicon.attach,
        category: CHAT_CATEGORY,
        keybinding: {
            when: ContextKeyExpr.and(ChatContextKeys.location.notEqualsTo(ChatAgentLocation.EditingSession), ChatContextKeys.inChatInput, ChatContextKeyExprs.inNonUnifiedPanel),
            primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
            weight: 100 /* KeybindingWeight.EditorContrib */,
        },
        menu: [
            {
                when: ChatContextKeyExprs.inNonUnifiedPanel,
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 2,
            },
        ],
    }) {
        super(desc);
    }
    _getFileContextId(item) {
        if ('resource' in item) {
            return item.resource.toString();
        }
        return (item.uri.toString() +
            (item.range.startLineNumber !== item.range.endLineNumber
                ? `:${item.range.startLineNumber}-${item.range.endLineNumber}`
                : `:${item.range.startLineNumber}`));
    }
    async _attachContext(widget, quickInputService, commandService, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, isInBackground, ...picks) {
        const toAttach = [];
        for (const pick of picks) {
            if (isISymbolQuickPickItem(pick) && pick.symbol) {
                // Workspace symbol
                toAttach.push({
                    kind: 'symbol',
                    id: this._getFileContextId(pick.symbol.location),
                    value: pick.symbol.location,
                    symbolKind: pick.symbol.kind,
                    fullName: pick.label,
                    name: pick.symbol.name,
                });
            }
            else if (isIFolderSearchResultQuickPickItem(pick)) {
                const folder = pick.resource;
                toAttach.push({
                    id: pick.id,
                    value: folder,
                    name: basename(folder),
                    isFile: false,
                    isDirectory: true,
                });
            }
            else if (isIDiagnosticsQuickPickItemWithFilter(pick)) {
                toAttach.push({
                    id: pick.id,
                    name: pick.label,
                    value: pick.filter,
                    kind: 'diagnostic',
                    icon: pick.icon,
                    ...pick.filter,
                });
            }
            else if (isIQuickPickItemWithResource(pick) && pick.resource) {
                if (/\.(png|jpg|jpeg|bmp|gif|tiff)$/i.test(pick.resource.path)) {
                    // checks if the file is an image
                    if (URI.isUri(pick.resource)) {
                        // read the image and attach a new file context.
                        const readFile = await fileService.readFile(pick.resource);
                        const resizedImage = await resizeImage(readFile.value.buffer);
                        toAttach.push({
                            id: pick.resource.toString(),
                            name: pick.label,
                            fullName: pick.label,
                            value: resizedImage,
                            isImage: true,
                        });
                    }
                }
                else {
                    let isOmitted = false;
                    try {
                        const createdModel = await textModelService.createModelReference(pick.resource);
                        createdModel.dispose();
                    }
                    catch {
                        isOmitted = true;
                    }
                    toAttach.push({
                        id: this._getFileContextId({ resource: pick.resource }),
                        value: pick.resource,
                        name: pick.label,
                        isFile: true,
                        isOmitted,
                    });
                }
            }
            else if (isIGotoSymbolQuickPickItem(pick) && pick.uri && pick.range) {
                toAttach.push({
                    range: undefined,
                    id: this._getFileContextId({ uri: pick.uri, range: pick.range.decoration }),
                    value: { uri: pick.uri, range: pick.range.decoration },
                    fullName: pick.label,
                    name: pick.symbolName,
                });
            }
            else if (isIOpenEditorsQuickPickItem(pick)) {
                for (const editor of editorService.editors.filter((e) => e instanceof FileEditorInput ||
                    e instanceof DiffEditorInput ||
                    e instanceof UntitledTextEditorInput ||
                    e instanceof NotebookEditorInput)) {
                    const uri = editor instanceof DiffEditorInput ? editor.modified.resource : editor.resource;
                    if (uri) {
                        toAttach.push({
                            id: this._getFileContextId({ resource: uri }),
                            value: uri,
                            name: labelService.getUriBasenameLabel(uri),
                            isFile: true,
                        });
                    }
                }
            }
            else if (isISearchResultsQuickPickItem(pick)) {
                const searchView = viewsService.getViewWithId(SEARCH_VIEW_ID);
                for (const result of searchView.model.searchResult.matches()) {
                    toAttach.push({
                        id: this._getFileContextId({ resource: result.resource }),
                        value: result.resource,
                        name: labelService.getUriBasenameLabel(result.resource),
                        isFile: true,
                    });
                }
            }
            else if (isRelatedFileQuickPickItem(pick)) {
                // Get all provider results and show them in a second tier picker
                const chatSessionId = widget.viewModel?.sessionId;
                if (!chatSessionId || !chatEditingService) {
                    continue;
                }
                const relatedFiles = await chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None);
                if (!relatedFiles) {
                    continue;
                }
                const attachments = widget.attachmentModel.getAttachmentIDs();
                const itemsPromise = chatEditingService
                    .getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
                    .then((files) => (files ?? []).reduce((acc, cur) => {
                    acc.push({ type: 'separator', label: cur.group });
                    for (const file of cur.files) {
                        acc.push({
                            type: 'item',
                            label: labelService.getUriBasenameLabel(file.uri),
                            description: labelService.getUriLabel(dirname(file.uri), { relative: true }),
                            value: file.uri,
                            disabled: attachments.has(this._getFileContextId({ resource: file.uri })),
                            picked: true,
                        });
                    }
                    return acc;
                }, []));
                const selectedFiles = await quickInputService.pick(itemsPromise, {
                    placeHolder: localize('relatedFiles', 'Add related files to your working set'),
                    canPickMany: true,
                });
                for (const file of selectedFiles ?? []) {
                    toAttach.push({
                        id: this._getFileContextId({ resource: file.value }),
                        value: file.value,
                        name: file.label,
                        isFile: true,
                        isOmitted: false,
                    });
                }
            }
            else if (isScreenshotQuickPickItem(pick)) {
                const blob = await hostService.getScreenshot();
                if (blob) {
                    toAttach.push(convertBufferToScreenshotVariable(blob));
                }
            }
            else if (isPromptInstructionsQuickPickItem(pick)) {
                const options = { widget };
                await commandService.executeCommand(ATTACH_PROMPT_ACTION_ID, options);
            }
            else {
                // Anything else is an attachment
                const attachmentPick = pick;
                if (attachmentPick.kind === 'command') {
                    // Dynamic variable with a followup command
                    const selection = await commandService.executeCommand(attachmentPick.command.id, ...(attachmentPick.command.arguments ?? []));
                    if (!selection) {
                        // User made no selection, skip this variable
                        continue;
                    }
                    toAttach.push({
                        ...attachmentPick,
                        value: attachmentPick.value,
                        name: `${typeof attachmentPick.value === 'string' && attachmentPick.value.startsWith('#') ? attachmentPick.value.slice(1) : ''}${selection}`,
                        // Apply the original icon with the new name
                        fullName: selection,
                    });
                }
                else if (attachmentPick.kind === 'tool') {
                    toAttach.push({
                        id: attachmentPick.id,
                        name: attachmentPick.label,
                        fullName: attachmentPick.label,
                        value: undefined,
                        icon: attachmentPick.icon,
                        isTool: true,
                    });
                }
                else if (attachmentPick.kind === 'image') {
                    const fileBuffer = await clipboardService.readImage();
                    toAttach.push({
                        id: await imageToHash(fileBuffer),
                        name: localize('pastedImage', 'Pasted Image'),
                        fullName: localize('pastedImage', 'Pasted Image'),
                        value: fileBuffer,
                        isImage: true,
                    });
                }
            }
        }
        widget.attachmentModel.addContext(...toAttach);
        if (!isInBackground) {
            // Set focus back into the input once the user is done attaching items
            // so that the user can start typing their message
            widget.focusInput();
        }
    }
    async run(accessor, ...args) {
        const quickInputService = accessor.get(IQuickInputService);
        const chatAgentService = accessor.get(IChatAgentService);
        const commandService = accessor.get(ICommandService);
        const widgetService = accessor.get(IChatWidgetService);
        const languageModelToolsService = accessor.get(ILanguageModelToolsService);
        const quickChatService = accessor.get(IQuickChatService);
        const clipboardService = accessor.get(IClipboardService);
        const editorService = accessor.get(IEditorService);
        const labelService = accessor.get(ILabelService);
        const contextKeyService = accessor.get(IContextKeyService);
        const viewsService = accessor.get(IViewsService);
        const hostService = accessor.get(IHostService);
        const extensionService = accessor.get(IExtensionService);
        const fileService = accessor.get(IFileService);
        const textModelService = accessor.get(ITextModelService);
        const instantiationService = accessor.get(IInstantiationService);
        const keybindingService = accessor.get(IKeybindingService);
        const context = args[0];
        const widget = context?.widget ?? widgetService.lastFocusedWidget;
        if (!widget) {
            return;
        }
        const chatEditingService = widget.location === ChatAgentLocation.EditingSession || widget.isUnifiedPanelWidget
            ? accessor.get(IChatEditingService)
            : undefined;
        const quickPickItems = [];
        if (extensionService.extensions.some((ext) => isProposedApiEnabled(ext, 'chatReferenceBinaryData'))) {
            const imageData = await clipboardService.readImage();
            if (isImage(imageData)) {
                quickPickItems.push({
                    kind: 'image',
                    id: await imageToHash(imageData),
                    label: localize('imageFromClipboard', 'Image from Clipboard'),
                    iconClass: ThemeIcon.asClassName(Codicon.fileMedia),
                });
            }
            quickPickItems.push({
                kind: 'screenshot',
                id: ScreenshotVariableId,
                icon: ThemeIcon.fromId(Codicon.deviceCamera.id),
                iconClass: ThemeIcon.asClassName(Codicon.deviceCamera),
                label: isElectron
                    ? localize('chatContext.attachScreenshot.labelElectron.Window', 'Screenshot Window')
                    : localize('chatContext.attachScreenshot.labelWeb', 'Screenshot'),
            });
        }
        if (widget.viewModel?.sessionId) {
            const agentPart = widget.parsedInput.parts.find((part) => part instanceof ChatRequestAgentPart);
            if (agentPart) {
                const completions = await chatAgentService.getAgentCompletionItems(agentPart.agent.id, '', CancellationToken.None);
                for (const variable of completions) {
                    if (variable.fullName && variable.command) {
                        quickPickItems.push({
                            kind: 'command',
                            label: variable.fullName,
                            id: variable.id,
                            command: variable.command,
                            icon: variable.icon,
                            iconClass: variable.icon ? ThemeIcon.asClassName(variable.icon) : undefined,
                            value: variable.value,
                            name: variable.name,
                        });
                    }
                    else {
                        // Currently there's nothing that falls into this category
                    }
                }
            }
        }
        for (const tool of languageModelToolsService.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                const item = {
                    kind: 'tool',
                    label: tool.displayName ?? '',
                    id: tool.id,
                    icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined, // TODO need to support icon path?
                };
                if (ThemeIcon.isThemeIcon(tool.icon)) {
                    item.iconClass = ThemeIcon.asClassName(tool.icon);
                }
                else if (tool.icon) {
                    item.iconPath = tool.icon;
                }
                quickPickItems.push(item);
            }
        }
        quickPickItems.push({
            kind: 'quickaccess',
            label: localize('chatContext.symbol', 'Symbol...'),
            iconClass: ThemeIcon.asClassName(Codicon.symbolField),
            prefix: SymbolsQuickAccessProvider.PREFIX,
            id: 'symbol',
        });
        quickPickItems.push({
            kind: 'folder',
            label: localize('chatContext.folder', 'Folder...'),
            iconClass: ThemeIcon.asClassName(Codicon.folder),
            id: 'folder',
        });
        quickPickItems.push({
            kind: 'diagnostic',
            label: localize('chatContext.diagnstic', 'Problem...'),
            iconClass: ThemeIcon.asClassName(Codicon.error),
            id: 'diagnostic',
        });
        if (widget.location === ChatAgentLocation.Notebook) {
            quickPickItems.push({
                kind: 'command',
                id: 'chatContext.notebook.kernelVariable',
                icon: ThemeIcon.fromId(Codicon.serverEnvironment.id),
                iconClass: ThemeIcon.asClassName(Codicon.serverEnvironment),
                value: 'kernelVariable',
                label: localize('chatContext.notebook.kernelVariable', 'Kernel Variable...'),
                command: {
                    id: 'notebook.chat.selectAndInsertKernelVariable',
                    title: localize('chatContext.notebook.selectkernelVariable', 'Select and Insert Kernel Variable'),
                    arguments: [{ widget, range: undefined }],
                },
            });
        }
        if (context?.showFilesOnly) {
            if (chatEditingService?.hasRelatedFilesProviders() &&
                (widget.getInput() || widget.attachmentModel.fileAttachments.length > 0)) {
                quickPickItems.unshift({
                    kind: 'related-files',
                    id: 'related-files',
                    label: localize('chatContext.relatedFiles', 'Related Files'),
                    iconClass: ThemeIcon.asClassName(Codicon.sparkle),
                });
            }
            if (editorService.editors.filter((e) => e instanceof FileEditorInput ||
                e instanceof DiffEditorInput ||
                e instanceof UntitledTextEditorInput).length > 0) {
                quickPickItems.unshift({
                    kind: 'open-editors',
                    id: 'open-editors',
                    label: localize('chatContext.editors', 'Open Editors'),
                    iconClass: ThemeIcon.asClassName(Codicon.files),
                });
            }
            if (SearchContext.HasSearchResults.getValue(contextKeyService)) {
                quickPickItems.unshift({
                    kind: 'search-results',
                    id: 'search-results',
                    label: localize('chatContext.searchResults', 'Search Results'),
                    iconClass: ThemeIcon.asClassName(Codicon.search),
                });
            }
        }
        // if the `reusable prompts` feature is enabled, add
        // the appropriate attachment type to the list
        if (widget.attachmentModel.promptInstructions.featureEnabled) {
            const keybinding = keybindingService.lookupKeybinding(USE_PROMPT_COMMAND_ID, contextKeyService);
            quickPickItems.push({
                id: REUSABLE_PROMPT_PICK_ID,
                kind: REUSABLE_PROMPT_PICK_ID,
                label: localize('chatContext.attach.prompt.label', 'Prompt...'),
                iconClass: ThemeIcon.asClassName(Codicon.bookmark),
                keybinding,
            });
        }
        function extractTextFromIconLabel(label) {
            if (!label) {
                return '';
            }
            const match = label.match(/\$\([^\)]+\)\s*(.+)/);
            return match ? match[1] : label;
        }
        this._show(quickInputService, commandService, widget, quickChatService, quickPickItems.sort(function (a, b) {
            if (a.kind === 'open-editors') {
                return -1;
            }
            if (b.kind === 'open-editors') {
                return 1;
            }
            const first = extractTextFromIconLabel(a.label).toUpperCase();
            const second = extractTextFromIconLabel(b.label).toUpperCase();
            return compare(first, second);
        }), clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, '', context?.placeholder);
    }
    async _showDiagnosticsPick(instantiationService, onBackgroundAccept) {
        const convert = (item) => ({
            kind: 'diagnostic-filter',
            id: IDiagnosticVariableEntryFilterData.id(item),
            label: IDiagnosticVariableEntryFilterData.label(item),
            icon: IDiagnosticVariableEntryFilterData.icon,
            filter: item,
        });
        const filter = await instantiationService.invokeFunction((accessor) => createMarkersQuickPick(accessor, 'problem', (items) => onBackgroundAccept(items.map(convert))));
        return filter && convert(filter);
    }
    _show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, query = '', placeholder) {
        const attach = (isBackgroundAccept, ...items) => {
            this._attachContext(widget, quickInputService, commandService, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, isBackgroundAccept, ...items);
        };
        const providerOptions = {
            handleAccept: async (inputItem, isBackgroundAccept) => {
                let item = inputItem;
                if ('kind' in item && item.kind === 'folder') {
                    item = await this._showFolders(instantiationService);
                }
                else if ('kind' in item && item.kind === 'diagnostic') {
                    item = await this._showDiagnosticsPick(instantiationService, (i) => attach(true, ...i));
                }
                if (!item) {
                    this._show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, '', placeholder);
                    return;
                }
                if ('prefix' in item) {
                    this._show(quickInputService, commandService, widget, quickChatService, quickPickItems, clipboardService, editorService, labelService, viewsService, chatEditingService, hostService, fileService, textModelService, instantiationService, item.prefix, placeholder);
                }
                else {
                    if (!clipboardService) {
                        return;
                    }
                    attach(isBackgroundAccept, item);
                    if (isQuickChat(widget)) {
                        quickChatService.open();
                    }
                }
            },
            additionPicks: quickPickItems,
            filter: (item) => {
                // Avoid attaching the same context twice
                const attachedContext = widget.attachmentModel.getAttachmentIDs();
                if (isIOpenEditorsQuickPickItem(item)) {
                    for (const editor of editorService.editors.filter((e) => e instanceof FileEditorInput ||
                        e instanceof DiffEditorInput ||
                        e instanceof UntitledTextEditorInput)) {
                        // There is an open editor that hasn't yet been attached to the chat
                        if (editor.resource &&
                            !attachedContext.has(this._getFileContextId({ resource: editor.resource }))) {
                            return true;
                        }
                    }
                    return false;
                }
                if ('kind' in item && item.kind === 'image') {
                    return !attachedContext.has(item.id);
                }
                if ('symbol' in item && item.symbol) {
                    return !attachedContext.has(this._getFileContextId(item.symbol.location));
                }
                if (item && typeof item === 'object' && 'resource' in item && URI.isUri(item.resource)) {
                    return ([Schemas.file, Schemas.vscodeRemote, Schemas.untitled].includes(item.resource.scheme) &&
                        !attachedContext.has(this._getFileContextId({ resource: item.resource }))); // Hack because Typescript doesn't narrow this type correctly
                }
                if (item && typeof item === 'object' && 'uri' in item && item.uri && item.range) {
                    return !attachedContext.has(this._getFileContextId({ uri: item.uri, range: item.range.decoration }));
                }
                if (!('command' in item) && item.id) {
                    return !attachedContext.has(item.id);
                }
                // Don't filter out dynamic variables which show secondary data (temporary)
                return true;
            },
        };
        quickInputService.quickAccess.show(query, {
            enabledProviderPrefixes: [
                AnythingQuickAccessProvider.PREFIX,
                SymbolsQuickAccessProvider.PREFIX,
                AbstractGotoSymbolQuickAccessProvider.PREFIX,
            ],
            placeholder: placeholder ?? localize('chatContext.attach.placeholder', 'Search attachments'),
            providerOptions,
        });
    }
    async _showFolders(instantiationService) {
        const folder = await instantiationService.invokeFunction((accessor) => createFolderQuickPick(accessor));
        if (!folder) {
            return undefined;
        }
        return {
            kind: 'folder-search-result',
            id: folder.toString(),
            label: basename(folder),
            resource: folder,
        };
    }
}
registerAction2(class AttachFilesAction extends AttachContextAction {
    constructor() {
        super({
            id: 'workbench.action.chat.editing.attachContext',
            title: localize2('workbench.action.chat.editing.attachContext.label', 'Add Context to Copilot Edits'),
            shortTitle: localize2('workbench.action.chat.editing.attachContext.shortLabel', 'Add Context...'),
            f1: false,
            category: CHAT_CATEGORY,
            menu: {
                when: ChatContextKeyExprs.inEditsOrUnified,
                id: MenuId.ChatInputAttachmentToolbar,
                group: 'navigation',
                order: 3,
            },
            icon: Codicon.attach,
            precondition: ChatContextKeyExprs.inEditsOrUnified,
            keybinding: {
                when: ContextKeyExpr.and(ChatContextKeys.inChatInput, ChatContextKeyExprs.inEditsOrUnified),
                primary: 2048 /* KeyMod.CtrlCmd */ | 90 /* KeyCode.Slash */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        const attachFilesContext = { ...context, showFilesOnly: true };
        return super.run(accessor, attachFilesContext);
    }
});
registerAction2(AttachPromptAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29udGV4dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDOUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FBTyxFQUNOLHFDQUFxQyxHQUVyQyxNQUFNLDRFQUE0RSxDQUFBO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDM0QsT0FBTyxFQUNOLE9BQU8sRUFFUCxNQUFNLEVBQ04sZUFBZSxHQUNmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcs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