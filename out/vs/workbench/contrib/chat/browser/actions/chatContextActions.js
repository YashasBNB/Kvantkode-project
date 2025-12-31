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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRBY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdENvbnRleHRBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFDTixxQ0FBcUMsR0FFckMsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFDTixPQUFPLEVBRVAsTUFBTSxFQUNOLGVBQWUsR0FDZixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFB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