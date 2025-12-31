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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdER5bmFtaWNWYXJpYWJsZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0RHluYW1pY1ZhcmlhYmxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzFFLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFMUUsT0FBTyxFQUFXLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzVGLE9BQU8sRUFB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