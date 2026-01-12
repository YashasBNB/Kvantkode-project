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
var ChatDynamicVariableModel_1;
import { coalesce, groupBy } from '../../../../../base/common/arrays.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { isCancellationError } from '../../../../../base/common/errors.js';
import * as glob from '../../../../../base/common/glob.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { basename, dirname, joinPath, relativePath } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { isLocation } from '../../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FileType, IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IMarkerService, MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { PromptsConfig } from '../../../../../platform/prompts/common/config.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { getExcludes, ISearchService, } from '../../../../services/search/common/search.js';
import { IDiagnosticVariableEntryFilterData } from '../../common/chatModel.js';
import { ChatWidget } from '../chatWidget.js';
import { ChatFileReference } from './chatDynamicVariables/chatFileReference.js';
export const dynamicVariableDecorationType = 'chat-dynamic-variable';
let ChatDynamicVariableModel = class ChatDynamicVariableModel extends Disposable {
    static { ChatDynamicVariableModel_1 = this; }
    static { this.ID = 'chatDynamicVariableModel'; }
    get variables() {
        return [...this._variables];
    }
    get id() {
        return ChatDynamicVariableModel_1.ID;
    }
    constructor(widget, labelService, configService, instantiationService) {
        super();
        this.widget = widget;
        this.labelService = labelService;
        this.configService = configService;
        this.instantiationService = instantiationService;
        this._variables = [];
        this._register(widget.inputEditor.onDidChangeModelContent((e) => {
            e.changes.forEach((c) => {
                // Don't mutate entries in _variables, since they will be returned from the getter
                this._variables = coalesce(this._variables.map((ref) => {
                    const intersection = Range.intersectRanges(ref.range, c.range);
                    if (intersection && !intersection.isEmpty()) {
                        // The reference text was changed, it's broken.
                        // But if the whole reference range was deleted (eg history navigation) then don't try to change the editor.
                        if (!Range.containsRange(c.range, ref.range)) {
                            const rangeToDelete = new Range(ref.range.startLineNumber, ref.range.startColumn, ref.range.endLineNumber, ref.range.endColumn - 1);
                            this.widget.inputEditor.executeEdits(this.id, [
                                {
                                    range: rangeToDelete,
                                    text: '',
                                },
                            ]);
                            this.widget.refreshParsedInput();
                        }
                        // dispose the reference if possible before dropping it off
                        if ('dispose' in ref && typeof ref.dispose === 'function') {
                            ref.dispose();
                        }
                        return null;
                    }
                    else if (Range.compareRangesUsingStarts(ref.range, c.range) > 0) {
                        const delta = c.text.length - c.rangeLength;
                        ref.range = {
                            startLineNumber: ref.range.startLineNumber,
                            startColumn: ref.range.startColumn + delta,
                            endLineNumber: ref.range.endLineNumber,
                            endColumn: ref.range.endColumn + delta,
                        };
                        return ref;
                    }
                    return ref;
                }));
            });
            this.updateDecorations();
        }));
    }
    getInputState() {
        return this.variables.map((variable) => {
            // return underlying `IDynamicVariable` object for file references
            if (variable instanceof ChatFileReference) {
                return variable.reference;
            }
            return variable;
        });
    }
    setInputState(s) {
        if (!Array.isArray(s)) {
            s = [];
        }
        this.disposeVariables();
        this._variables = [];
        for (const variable of s) {
            if (!isDynamicVariable(variable)) {
                continue;
            }
            this.addReference(variable);
        }
    }
    addReference(ref) {
        // use `ChatFileReference` for file references and `IDynamicVariable` for other variables
        const promptSnippetsEnabled = PromptsConfig.enabled(this.configService);
        const variable = ref.id === 'vscode.file' && promptSnippetsEnabled
            ? this.instantiationService.createInstance(ChatFileReference, ref)
            : ref;
        this._variables.push(variable);
        this.updateDecorations();
        this.widget.refreshParsedInput();
        // if the `prompt snippets` feature is enabled, and file is a `prompt snippet`,
        // start resolving nested file references immediately and subscribe to updates
        if (variable instanceof ChatFileReference && variable.isPromptFile) {
            // subscribe to variable changes
            variable.onUpdate(() => {
                this.updateDecorations();
            });
            // start resolving the file references
            variable.start();
        }
    }
    updateDecorations() {
        this.widget.inputEditor.setDecorationsByType('chat', dynamicVariableDecorationType, this._variables.map((r) => ({
            range: r.range,
            hoverMessage: this.getHoverForReference(r),
        })));
    }
    getHoverForReference(ref) {
        const value = ref.data;
        if (URI.isUri(value)) {
            return new MarkdownString(this.labelService.getUriLabel(value, { relative: true }));
        }
        else if (isLocation(value)) {
            const prefix = ref.fullName ? ` ${ref.fullName}` : '';
            const rangeString = `#${value.range.startLineNumber}-${value.range.endLineNumber}`;
            return new MarkdownString(prefix + this.labelService.getUriLabel(value.uri, { relative: true }) + rangeString);
        }
        else {
            return undefined;
        }
    }
    /**
     * Dispose all existing variables.
     */
    disposeVariables() {
        for (const variable of this._variables) {
            if ('dispose' in variable && typeof variable.dispose === 'function') {
                variable.dispose();
            }
        }
    }
    dispose() {
        this.disposeVariables();
        super.dispose();
    }
};
ChatDynamicVariableModel = ChatDynamicVariableModel_1 = __decorate([
    __param(1, ILabelService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService)
], ChatDynamicVariableModel);
export { ChatDynamicVariableModel };
/**
 * Loose check to filter objects that are obviously missing data
 */
function isDynamicVariable(obj) {
    return obj && typeof obj.id === 'string' && Range.isIRange(obj.range) && 'data' in obj;
}
ChatWidget.CONTRIBS.push(ChatDynamicVariableModel);
function isSelectAndInsertActionContext(context) {
    return 'widget' in context && 'range' in context;
}
export class SelectAndInsertFileAction extends Action2 {
    static { this.Name = 'files'; }
    static { this.Item = {
        label: localize('allFiles', 'All Files'),
        description: localize('allFilesDescription', 'Search for relevant files in the workspace and provide context from them'),
    }; }
    static { this.ID = 'workbench.action.chat.selectAndInsertFile'; }
    constructor() {
        super({
            id: SelectAndInsertFileAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const quickInputService = accessor.get(IQuickInputService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `file`
            context.widget.inputEditor.executeEdits('chatInsertFile', [
                { range: context.range, text: `` },
            ]);
        };
        let options;
        // TODO: have dedicated UX for this instead of using the quick access picker
        const picks = await quickInputService.quickAccess.pick('', options);
        if (!picks?.length) {
            logService.trace('SelectAndInsertFileAction: no file selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        // Handle the special case of selecting all files
        if (picks[0] === SelectAndInsertFileAction.Item) {
            const text = `#${SelectAndInsertFileAction.Name}`;
            const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
            if (!success) {
                logService.trace(`SelectAndInsertFileAction: failed to insert "${text}"`);
                doCleanup();
            }
            return;
        }
        // Handle the case of selecting a specific file
        const resource = picks[0].resource;
        if (!textModelService.canHandleResource(resource)) {
            logService.trace('SelectAndInsertFileAction: non-text resource selected');
            doCleanup();
            return;
        }
        const fileName = basename(resource);
        const text = `#file:${fileName}`;
        const success = editor.executeEdits('chatInsertFile', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertFileAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.file',
            isFile: true,
            prefix: 'file',
            range: {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.startColumn + text.length,
            },
            data: resource,
        });
    }
}
registerAction2(SelectAndInsertFileAction);
export class SelectAndInsertFolderAction extends Action2 {
    static { this.Name = 'folder'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertFolder'; }
    constructor() {
        super({
            id: SelectAndInsertFolderAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `folder`
            context.widget.inputEditor.executeEdits('chatInsertFolder', [
                { range: context.range, text: `` },
            ]);
        };
        const folder = await createFolderQuickPick(accessor);
        if (!folder) {
            logService.trace('SelectAndInsertFolderAction: no folder selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        const folderName = basename(folder);
        const text = `#folder:${folderName}`;
        const success = editor.executeEdits('chatInsertFolder', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertFolderAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.folder',
            isFile: false,
            isDirectory: true,
            prefix: 'folder',
            range: {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.startColumn + text.length,
            },
            data: folder,
        });
    }
}
registerAction2(SelectAndInsertFolderAction);
export async function createFolderQuickPick(accessor) {
    const quickInputService = accessor.get(IQuickInputService);
    const searchService = accessor.get(ISearchService);
    const configurationService = accessor.get(IConfigurationService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    const workspaces = workspaceService.getWorkspace().folders.map((folder) => folder.uri);
    const topLevelFolderItems = (await getTopLevelFolders(workspaces, fileService)).map(createQuickPickItem);
    const quickPick = quickInputService.createQuickPick();
    quickPick.placeholder = 'Search folder by name';
    quickPick.items = topLevelFolderItems;
    return await new Promise((_resolve) => {
        const disposables = new DisposableStore();
        const resolve = (res) => {
            _resolve(res);
            disposables.dispose();
            quickPick.dispose();
        };
        disposables.add(quickPick.onDidChangeValue(async (value) => {
            if (value === '') {
                quickPick.items = topLevelFolderItems;
                return;
            }
            const workspaceFolders = await Promise.all(workspaces.map((workspace) => searchFolders(workspace, value, true, undefined, undefined, configurationService, searchService)));
            quickPick.items = workspaceFolders.flat().map(createQuickPickItem);
        }));
        disposables.add(quickPick.onDidAccept((e) => {
            const value = quickPick.selectedItems[0]?.resource;
            resolve(value);
        }));
        disposables.add(quickPick.onDidHide(() => {
            resolve(undefined);
        }));
        quickPick.show();
    });
    function createQuickPickItem(folder) {
        return {
            type: 'item',
            id: folder.toString(),
            resource: folder,
            alwaysShow: true,
            label: basename(folder),
            description: labelService.getUriLabel(dirname(folder), { relative: true }),
            iconClass: ThemeIcon.asClassName(Codicon.folder),
        };
    }
}
export async function getTopLevelFolders(workspaces, fileService) {
    const folders = [];
    for (const workspace of workspaces) {
        const fileSystemProvider = fileService.getProvider(workspace.scheme);
        if (!fileSystemProvider) {
            continue;
        }
        const entries = await fileSystemProvider.readdir(workspace);
        for (const [name, type] of entries) {
            const entryResource = joinPath(workspace, name);
            if (type === FileType.Directory) {
                folders.push(entryResource);
            }
        }
    }
    return folders;
}
export async function searchFolders(workspace, pattern, fuzzyMatch, token, cacheKey, configurationService, searchService) {
    const segmentMatchPattern = caseInsensitiveGlobPattern(fuzzyMatch ? fuzzyMatchingGlobPattern(pattern) : continousMatchingGlobPattern(pattern));
    const searchExcludePattern = getExcludes(configurationService.getValue({ resource: workspace })) || {};
    const searchOptions = {
        folderQueries: [
            {
                folder: workspace,
                disregardIgnoreFiles: configurationService.getValue('explorer.excludeGitIgnore'),
            },
        ],
        type: 1 /* QueryType.File */,
        shouldGlobMatchFilePattern: true,
        cacheKey,
        excludePattern: searchExcludePattern,
    };
    let folderResults;
    try {
        folderResults = await searchService.fileSearch({ ...searchOptions, filePattern: `**/${segmentMatchPattern}/**` }, token);
    }
    catch (e) {
        if (!isCancellationError(e)) {
            throw e;
        }
    }
    if (!folderResults || token?.isCancellationRequested) {
        return [];
    }
    const folderResources = getMatchingFoldersFromFiles(folderResults.results.map((result) => result.resource), workspace, segmentMatchPattern);
    return folderResources;
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
// TODO: remove this and have support from the search service
function getMatchingFoldersFromFiles(resources, workspace, segmentMatchPattern) {
    const uniqueFolders = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(workspace, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the workspace');
        }
        let dirResource = workspace;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueFolders.add(dirResource);
        }
    }
    const matchingFolders = [];
    for (const folderResource of uniqueFolders) {
        const stats = folderResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingFolders.push(folderResource);
    }
    return matchingFolders;
}
export class SelectAndInsertSymAction extends Action2 {
    static { this.Name = 'symbols'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertSym'; }
    constructor() {
        super({
            id: SelectAndInsertSymAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const textModelService = accessor.get(ITextModelService);
        const logService = accessor.get(ILogService);
        const quickInputService = accessor.get(IQuickInputService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `sym`
            context.widget.inputEditor.executeEdits('chatInsertSym', [{ range: context.range, text: `` }]);
        };
        // TODO: have dedicated UX for this instead of using the quick access picker
        const picks = await quickInputService.quickAccess.pick('#', { enabledProviderPrefixes: ['#'] });
        if (!picks?.length) {
            logService.trace('SelectAndInsertSymAction: no symbol selected');
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const range = context.range;
        // Handle the case of selecting a specific file
        const symbol = picks[0].symbol;
        if (!symbol || !textModelService.canHandleResource(symbol.location.uri)) {
            logService.trace('SelectAndInsertSymAction: non-text resource selected');
            doCleanup();
            return;
        }
        const text = `#sym:${symbol.name}`;
        const success = editor.executeEdits('chatInsertSym', [{ range, text: text + ' ' }]);
        if (!success) {
            logService.trace(`SelectAndInsertSymAction: failed to insert "${text}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.symbol',
            prefix: 'symbol',
            range: {
                startLineNumber: range.startLineNumber,
                startColumn: range.startColumn,
                endLineNumber: range.endLineNumber,
                endColumn: range.startColumn + text.length,
            },
            data: symbol.location,
        });
    }
}
registerAction2(SelectAndInsertSymAction);
function isAddDynamicVariableContext(context) {
    return 'widget' in context && 'range' in context && 'variableData' in context;
}
export class AddDynamicVariableAction extends Action2 {
    static { this.ID = 'workbench.action.chat.addDynamicVariable'; }
    constructor() {
        super({
            id: AddDynamicVariableAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const context = args[0];
        if (!isAddDynamicVariableContext(context)) {
            return;
        }
        let range = context.range;
        const variableData = context.variableData;
        const doCleanup = () => {
            // Failed, remove the dangling variable prefix
            context.widget.inputEditor.executeEdits('chatInsertDynamicVariableWithArguments', [
                { range: context.range, text: `` },
            ]);
        };
        // If this completion item has no command, return it directly
        if (context.command) {
            // Invoke the command on this completion item along with its args and return the result
            const commandService = accessor.get(ICommandService);
            const selection = await commandService.executeCommand(context.command.id, ...(context.command.arguments ?? []));
            if (!selection) {
                doCleanup();
                return;
            }
            // Compute new range and variableData
            const insertText = ':' + selection;
            const insertRange = new Range(range.startLineNumber, range.endColumn, range.endLineNumber, range.endColumn + insertText.length);
            range = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn + insertText.length);
            const editor = context.widget.inputEditor;
            const success = editor.executeEdits('chatInsertDynamicVariableWithArguments', [
                { range: insertRange, text: insertText + ' ' },
            ]);
            if (!success) {
                doCleanup();
                return;
            }
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: context.id,
            range: range,
            isFile: true,
            prefix: 'file',
            data: variableData,
        });
    }
}
registerAction2(AddDynamicVariableAction);
export async function createMarkersQuickPick(accessor, level, onBackgroundAccept) {
    const markers = accessor
        .get(IMarkerService)
        .read({ severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info });
    if (!markers.length) {
        return;
    }
    const uriIdentityService = accessor.get(IUriIdentityService);
    const labelService = accessor.get(ILabelService);
    const grouped = groupBy(markers, (a, b) => uriIdentityService.extUri.compare(a.resource, b.resource));
    const severities = new Set();
    const items = [];
    let pickCount = 0;
    for (const group of grouped) {
        const resource = group[0].resource;
        if (level === 'problem') {
            items.push({
                type: 'separator',
                label: labelService.getUriLabel(resource, { relative: true }),
            });
            for (const marker of group) {
                pickCount++;
                severities.add(marker.severity);
                items.push({
                    type: 'item',
                    resource: marker.resource,
                    label: marker.message,
                    description: localize('markers.panel.at.ln.col.number', '[Ln {0}, Col {1}]', '' + marker.startLineNumber, '' + marker.startColumn),
                    entry: IDiagnosticVariableEntryFilterData.fromMarker(marker),
                });
            }
        }
        else if (level === 'file') {
            const entry = { filterUri: resource };
            pickCount++;
            items.push({
                type: 'item',
                resource,
                label: IDiagnosticVariableEntryFilterData.label(entry),
                description: group[0].message +
                    (group.length > 1 ? localize('problemsMore', '+ {0} more', group.length - 1) : ''),
                entry,
            });
            for (const marker of group) {
                severities.add(marker.severity);
            }
        }
        else {
            assertNever(level);
        }
    }
    if (pickCount < 2) {
        // single error in a URI
        return items.find((i) => i.type === 'item')?.entry;
    }
    if (level === 'file') {
        items.unshift({ type: 'separator', label: localize('markers.panel.files', 'Files') });
    }
    items.unshift({
        type: 'item',
        label: localize('markers.panel.allErrors', 'All Problems'),
        entry: { filterSeverity: MarkerSeverity.Info },
    });
    const quickInputService = accessor.get(IQuickInputService);
    const store = new DisposableStore();
    const quickPick = store.add(quickInputService.createQuickPick({ useSeparators: true }));
    quickPick.canAcceptInBackground = !onBackgroundAccept;
    quickPick.placeholder = localize('pickAProblem', 'Pick a problem to attach...');
    quickPick.items = items;
    return new Promise((resolve) => {
        store.add(quickPick.onDidHide(() => resolve(undefined)));
        store.add(quickPick.onDidAccept((ev) => {
            if (ev.inBackground) {
                onBackgroundAccept?.(quickPick.selectedItems.map((i) => i.entry));
            }
            else {
                resolve(quickPick.selectedItems[0]?.entry);
                quickPick.dispose();
            }
        }));
        quickPick.show();
    }).finally(() => store.dispose());
}
export class SelectAndInsertProblemAction extends Action2 {
    static { this.Name = 'problems'; }
    static { this.ID = 'workbench.action.chat.selectAndInsertProblems'; }
    constructor() {
        super({
            id: SelectAndInsertProblemAction.ID,
            title: '', // not displayed
        });
    }
    async run(accessor, ...args) {
        const logService = accessor.get(ILogService);
        const context = args[0];
        if (!isSelectAndInsertActionContext(context)) {
            return;
        }
        const doCleanup = () => {
            // Failed, remove the dangling `problem`
            context.widget.inputEditor.executeEdits('chatInsertProblems', [
                { range: context.range, text: `` },
            ]);
        };
        const pick = await createMarkersQuickPick(accessor, 'file');
        if (!pick) {
            doCleanup();
            return;
        }
        const editor = context.widget.inputEditor;
        const originalRange = context.range;
        const insertText = `#${SelectAndInsertProblemAction.Name}:${pick.filterUri ? basename(pick.filterUri) : MarkerSeverity.toString(pick.filterSeverity)}`;
        const varRange = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.startColumn + insertText.length);
        const success = editor.executeEdits('chatInsertProblems', [
            { range: varRange, text: insertText + ' ' },
        ]);
        if (!success) {
            logService.trace(`SelectAndInsertProblemsAction: failed to insert "${insertText}"`);
            doCleanup();
            return;
        }
        context.widget.getContrib(ChatDynamicVariableModel.ID)?.addReference({
            id: 'vscode.problems',
            prefix: SelectAndInsertProblemAction.Name,
            range: varRange,
            data: { id: 'vscode.problems', filter: pick },
        });
    }
}
registerAction2(SelectAndInsertProblemAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXREeW5hbWljVmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUUsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQW1CLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUUxRSxPQUFPLEVBQVcsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDNUYsT0FB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