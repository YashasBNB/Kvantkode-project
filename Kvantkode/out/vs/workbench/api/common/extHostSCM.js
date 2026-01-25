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
var ExtHostSCM_1;
/* eslint-disable local/code-no-native-private */
import { URI } from '../../../base/common/uri.js';
import { Event, Emitter } from '../../../base/common/event.js';
import { debounce } from '../../../base/common/decorators.js';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { asPromise } from '../../../base/common/async.js';
import { MainContext, } from './extHost.protocol.js';
import { sortedDiff, equals } from '../../../base/common/arrays.js';
import { comparePaths } from '../../../base/common/comparers.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtensionIdentifierMap, } from '../../../platform/extensions/common/extensions.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { MarkdownString } from './extHostTypeConverters.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { Schemas } from '../../../base/common/network.js';
import { isLinux } from '../../../base/common/platform.js';
import { structuralEquals } from '../../../base/common/equals.js';
function isUri(thing) {
    return thing instanceof URI;
}
function uriEquals(a, b) {
    if (a.scheme === Schemas.file && b.scheme === Schemas.file && isLinux) {
        return a.toString() === b.toString();
    }
    return a.toString().toLowerCase() === b.toString().toLowerCase();
}
function getIconResource(decorations) {
    if (!decorations) {
        return undefined;
    }
    else if (typeof decorations.iconPath === 'string') {
        return URI.file(decorations.iconPath);
    }
    else if (URI.isUri(decorations.iconPath)) {
        return decorations.iconPath;
    }
    else if (ThemeIcon.isThemeIcon(decorations.iconPath)) {
        return decorations.iconPath;
    }
    else {
        return undefined;
    }
}
function getHistoryItemIconDto(icon) {
    if (!icon) {
        return undefined;
    }
    else if (URI.isUri(icon)) {
        return icon;
    }
    else if (ThemeIcon.isThemeIcon(icon)) {
        return icon;
    }
    else {
        const iconDto = icon;
        return { light: iconDto.light, dark: iconDto.dark };
    }
}
function toSCMHistoryItemDto(historyItem) {
    const authorIcon = getHistoryItemIconDto(historyItem.authorIcon);
    const references = historyItem.references?.map((r) => ({
        ...r,
        icon: getHistoryItemIconDto(r.icon),
    }));
    return { ...historyItem, authorIcon, references };
}
function toSCMHistoryItemRefDto(historyItemRef) {
    return historyItemRef
        ? { ...historyItemRef, icon: getHistoryItemIconDto(historyItemRef.icon) }
        : undefined;
}
function compareResourceThemableDecorations(a, b) {
    if (!a.iconPath && !b.iconPath) {
        return 0;
    }
    else if (!a.iconPath) {
        return -1;
    }
    else if (!b.iconPath) {
        return 1;
    }
    const aPath = typeof a.iconPath === 'string'
        ? a.iconPath
        : URI.isUri(a.iconPath)
            ? a.iconPath.fsPath
            : a.iconPath.id;
    const bPath = typeof b.iconPath === 'string'
        ? b.iconPath
        : URI.isUri(b.iconPath)
            ? b.iconPath.fsPath
            : b.iconPath.id;
    return comparePaths(aPath, bPath);
}
function compareResourceStatesDecorations(a, b) {
    let result = 0;
    if (a.strikeThrough !== b.strikeThrough) {
        return a.strikeThrough ? 1 : -1;
    }
    if (a.faded !== b.faded) {
        return a.faded ? 1 : -1;
    }
    if (a.tooltip !== b.tooltip) {
        return (a.tooltip || '').localeCompare(b.tooltip || '');
    }
    result = compareResourceThemableDecorations(a, b);
    if (result !== 0) {
        return result;
    }
    if (a.light && b.light) {
        result = compareResourceThemableDecorations(a.light, b.light);
    }
    else if (a.light) {
        return 1;
    }
    else if (b.light) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.dark && b.dark) {
        result = compareResourceThemableDecorations(a.dark, b.dark);
    }
    else if (a.dark) {
        return 1;
    }
    else if (b.dark) {
        return -1;
    }
    return result;
}
function compareCommands(a, b) {
    if (a.command !== b.command) {
        return a.command < b.command ? -1 : 1;
    }
    if (a.title !== b.title) {
        return a.title < b.title ? -1 : 1;
    }
    if (a.tooltip !== b.tooltip) {
        if (a.tooltip !== undefined && b.tooltip !== undefined) {
            return a.tooltip < b.tooltip ? -1 : 1;
        }
        else if (a.tooltip !== undefined) {
            return 1;
        }
        else if (b.tooltip !== undefined) {
            return -1;
        }
    }
    if (a.arguments === b.arguments) {
        return 0;
    }
    else if (!a.arguments) {
        return -1;
    }
    else if (!b.arguments) {
        return 1;
    }
    else if (a.arguments.length !== b.arguments.length) {
        return a.arguments.length - b.arguments.length;
    }
    for (let i = 0; i < a.arguments.length; i++) {
        const aArg = a.arguments[i];
        const bArg = b.arguments[i];
        if (aArg === bArg) {
            continue;
        }
        if (isUri(aArg) && isUri(bArg) && uriEquals(aArg, bArg)) {
            continue;
        }
        return aArg < bArg ? -1 : 1;
    }
    return 0;
}
function compareResourceStates(a, b) {
    let result = comparePaths(a.resourceUri.fsPath, b.resourceUri.fsPath, true);
    if (result !== 0) {
        return result;
    }
    if (a.command && b.command) {
        result = compareCommands(a.command, b.command);
    }
    else if (a.command) {
        return 1;
    }
    else if (b.command) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.decorations && b.decorations) {
        result = compareResourceStatesDecorations(a.decorations, b.decorations);
    }
    else if (a.decorations) {
        return 1;
    }
    else if (b.decorations) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.multiFileDiffEditorModifiedUri && b.multiFileDiffEditorModifiedUri) {
        result = comparePaths(a.multiFileDiffEditorModifiedUri.fsPath, b.multiFileDiffEditorModifiedUri.fsPath, true);
    }
    else if (a.multiFileDiffEditorModifiedUri) {
        return 1;
    }
    else if (b.multiFileDiffEditorModifiedUri) {
        return -1;
    }
    if (result !== 0) {
        return result;
    }
    if (a.multiDiffEditorOriginalUri && b.multiDiffEditorOriginalUri) {
        result = comparePaths(a.multiDiffEditorOriginalUri.fsPath, b.multiDiffEditorOriginalUri.fsPath, true);
    }
    else if (a.multiDiffEditorOriginalUri) {
        return 1;
    }
    else if (b.multiDiffEditorOriginalUri) {
        return -1;
    }
    return result;
}
function compareArgs(a, b) {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
function commandEquals(a, b) {
    return (a.command === b.command &&
        a.title === b.title &&
        a.tooltip === b.tooltip &&
        (a.arguments && b.arguments
            ? compareArgs(a.arguments, b.arguments)
            : a.arguments === b.arguments));
}
function commandListEquals(a, b) {
    return equals(a, b, commandEquals);
}
export class ExtHostSCMInputBox {
    #proxy;
    #extHostDocuments;
    get value() {
        return this._value;
    }
    set value(value) {
        value = value ?? '';
        this.#proxy.$setInputBoxValue(this._sourceControlHandle, value);
        this.updateValue(value);
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(placeholder) {
        this.#proxy.$setInputBoxPlaceholder(this._sourceControlHandle, placeholder);
        this._placeholder = placeholder;
    }
    get validateInput() {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        return this._validateInput;
    }
    set validateInput(fn) {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        if (fn && typeof fn !== 'function') {
            throw new Error(`[${this._extension.identifier.value}]: Invalid SCM input box validation function`);
        }
        this._validateInput = fn;
        this.#proxy.$setValidationProviderIsEnabled(this._sourceControlHandle, !!fn);
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(enabled) {
        enabled = !!enabled;
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        this.#proxy.$setInputBoxEnablement(this._sourceControlHandle, enabled);
    }
    get visible() {
        return this._visible;
    }
    set visible(visible) {
        visible = !!visible;
        if (this._visible === visible) {
            return;
        }
        this._visible = visible;
        this.#proxy.$setInputBoxVisibility(this._sourceControlHandle, visible);
    }
    get document() {
        checkProposedApiEnabled(this._extension, 'scmTextDocument');
        return this.#extHostDocuments.getDocument(this._documentUri);
    }
    constructor(_extension, _extHostDocuments, proxy, _sourceControlHandle, _documentUri) {
        this._extension = _extension;
        this._sourceControlHandle = _sourceControlHandle;
        this._documentUri = _documentUri;
        this._value = '';
        this._onDidChange = new Emitter();
        this._placeholder = '';
        this._enabled = true;
        this._visible = true;
        this.#extHostDocuments = _extHostDocuments;
        this.#proxy = proxy;
    }
    showValidationMessage(message, type) {
        checkProposedApiEnabled(this._extension, 'scmValidation');
        this.#proxy.$showValidationMessage(this._sourceControlHandle, message, type);
    }
    $onInputBoxValueChange(value) {
        this.updateValue(value);
    }
    updateValue(value) {
        this._value = value;
        this._onDidChange.fire(value);
    }
}
class ExtHostSourceControlResourceGroup {
    static { this._handlePool = 0; }
    get disposed() {
        return this._disposed;
    }
    get id() {
        return this._id;
    }
    get label() {
        return this._label;
    }
    set label(label) {
        this._label = label;
        this._proxy.$updateGroupLabel(this._sourceControlHandle, this.handle, label);
    }
    get contextValue() {
        return this._contextValue;
    }
    set contextValue(contextValue) {
        this._contextValue = contextValue;
        this._proxy.$updateGroup(this._sourceControlHandle, this.handle, this.features);
    }
    get hideWhenEmpty() {
        return this._hideWhenEmpty;
    }
    set hideWhenEmpty(hideWhenEmpty) {
        this._hideWhenEmpty = hideWhenEmpty;
        this._proxy.$updateGroup(this._sourceControlHandle, this.handle, this.features);
    }
    get features() {
        return {
            contextValue: this.contextValue,
            hideWhenEmpty: this.hideWhenEmpty,
        };
    }
    get resourceStates() {
        return [...this._resourceStates];
    }
    set resourceStates(resources) {
        this._resourceStates = [...resources];
        this._onDidUpdateResourceStates.fire();
    }
    constructor(_proxy, _commands, _sourceControlHandle, _id, _label, multiDiffEditorEnableViewChanges, _extension) {
        this._proxy = _proxy;
        this._commands = _commands;
        this._sourceControlHandle = _sourceControlHandle;
        this._id = _id;
        this._label = _label;
        this.multiDiffEditorEnableViewChanges = multiDiffEditorEnableViewChanges;
        this._extension = _extension;
        this._resourceHandlePool = 0;
        this._resourceStates = [];
        this._resourceStatesMap = new Map();
        this._resourceStatesCommandsMap = new Map();
        this._resourceStatesDisposablesMap = new Map();
        this._onDidUpdateResourceStates = new Emitter();
        this.onDidUpdateResourceStates = this._onDidUpdateResourceStates.event;
        this._disposed = false;
        this._onDidDispose = new Emitter();
        this.onDidDispose = this._onDidDispose.event;
        this._handlesSnapshot = [];
        this._resourceSnapshot = [];
        this._contextValue = undefined;
        this._hideWhenEmpty = undefined;
        this.handle = ExtHostSourceControlResourceGroup._handlePool++;
    }
    getResourceState(handle) {
        return this._resourceStatesMap.get(handle);
    }
    $executeResourceCommand(handle, preserveFocus) {
        const command = this._resourceStatesCommandsMap.get(handle);
        if (!command) {
            return Promise.resolve(undefined);
        }
        return asPromise(() => this._commands.executeCommand(command.command, ...(command.arguments || []), preserveFocus));
    }
    _takeResourceStateSnapshot() {
        const snapshot = [...this._resourceStates].sort(compareResourceStates);
        const diffs = sortedDiff(this._resourceSnapshot, snapshot, compareResourceStates);
        const splices = diffs.map((diff) => {
            const toInsert = diff.toInsert.map((r) => {
                const handle = this._resourceHandlePool++;
                this._resourceStatesMap.set(handle, r);
                const sourceUri = r.resourceUri;
                let command;
                if (r.command) {
                    if (r.command.command === 'vscode.open' ||
                        r.command.command === 'vscode.diff' ||
                        r.command.command === 'vscode.changes') {
                        const disposables = new DisposableStore();
                        command = this._commands.converter.toInternal(r.command, disposables);
                        this._resourceStatesDisposablesMap.set(handle, disposables);
                    }
                    else {
                        this._resourceStatesCommandsMap.set(handle, r.command);
                    }
                }
                const hasScmMultiDiffEditorProposalEnabled = isProposedApiEnabled(this._extension, 'scmMultiDiffEditor');
                const multiFileDiffEditorOriginalUri = hasScmMultiDiffEditorProposalEnabled
                    ? r.multiDiffEditorOriginalUri
                    : undefined;
                const multiFileDiffEditorModifiedUri = hasScmMultiDiffEditorProposalEnabled
                    ? r.multiFileDiffEditorModifiedUri
                    : undefined;
                const icon = getIconResource(r.decorations);
                const lightIcon = (r.decorations && getIconResource(r.decorations.light)) || icon;
                const darkIcon = (r.decorations && getIconResource(r.decorations.dark)) || icon;
                const icons = [lightIcon, darkIcon];
                const tooltip = (r.decorations && r.decorations.tooltip) || '';
                const strikeThrough = r.decorations && !!r.decorations.strikeThrough;
                const faded = r.decorations && !!r.decorations.faded;
                const contextValue = r.contextValue || '';
                const rawResource = [
                    handle,
                    sourceUri,
                    icons,
                    tooltip,
                    strikeThrough,
                    faded,
                    contextValue,
                    command,
                    multiFileDiffEditorOriginalUri,
                    multiFileDiffEditorModifiedUri,
                ];
                return { rawResource, handle };
            });
            return { start: diff.start, deleteCount: diff.deleteCount, toInsert };
        });
        const rawResourceSplices = splices.map(({ start, deleteCount, toInsert }) => [start, deleteCount, toInsert.map((i) => i.rawResource)]);
        const reverseSplices = splices.reverse();
        for (const { start, deleteCount, toInsert } of reverseSplices) {
            const handles = toInsert.map((i) => i.handle);
            const handlesToDelete = this._handlesSnapshot.splice(start, deleteCount, ...handles);
            for (const handle of handlesToDelete) {
                this._resourceStatesMap.delete(handle);
                this._resourceStatesCommandsMap.delete(handle);
                this._resourceStatesDisposablesMap.get(handle)?.dispose();
                this._resourceStatesDisposablesMap.delete(handle);
            }
        }
        this._resourceSnapshot = snapshot;
        return rawResourceSplices;
    }
    dispose() {
        this._disposed = true;
        this._onDidDispose.fire();
    }
}
class ExtHostSourceControl {
    static { this._handlePool = 0; }
    #proxy;
    get id() {
        return this._id;
    }
    get label() {
        return this._label;
    }
    get rootUri() {
        return this._rootUri;
    }
    get inputBox() {
        return this._inputBox;
    }
    get count() {
        return this._count;
    }
    set count(count) {
        if (this._count === count) {
            return;
        }
        this._count = count;
        this.#proxy.$updateSourceControl(this.handle, { count });
    }
    get quickDiffProvider() {
        return this._quickDiffProvider;
    }
    set quickDiffProvider(quickDiffProvider) {
        this._quickDiffProvider = quickDiffProvider;
        let quickDiffLabel = undefined;
        if (isProposedApiEnabled(this._extension, 'quickDiffProvider')) {
            quickDiffLabel = quickDiffProvider?.label;
        }
        this.#proxy.$updateSourceControl(this.handle, {
            hasQuickDiffProvider: !!quickDiffProvider,
            quickDiffLabel,
        });
    }
    get historyProvider() {
        checkProposedApiEnabled(this._extension, 'scmHistoryProvider');
        return this._historyProvider;
    }
    set historyProvider(historyProvider) {
        checkProposedApiEnabled(this._extension, 'scmHistoryProvider');
        this._historyProvider = historyProvider;
        this._historyProviderDisposable.value = new DisposableStore();
        this.#proxy.$updateSourceControl(this.handle, { hasHistoryProvider: !!historyProvider });
        if (historyProvider) {
            this._historyProviderDisposable.value.add(historyProvider.onDidChangeCurrentHistoryItemRefs(() => {
                const historyItemRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemRef);
                const historyItemRemoteRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemRemoteRef);
                const historyItemBaseRef = toSCMHistoryItemRefDto(historyProvider?.currentHistoryItemBaseRef);
                this.#proxy.$onDidChangeHistoryProviderCurrentHistoryItemRefs(this.handle, historyItemRef, historyItemRemoteRef, historyItemBaseRef);
            }));
            this._historyProviderDisposable.value.add(historyProvider.onDidChangeHistoryItemRefs((e) => {
                if (e.added.length === 0 && e.modified.length === 0 && e.removed.length === 0) {
                    return;
                }
                const added = e.added.map((ref) => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) }));
                const modified = e.modified.map((ref) => ({
                    ...ref,
                    icon: getHistoryItemIconDto(ref.icon),
                }));
                const removed = e.removed.map((ref) => ({
                    ...ref,
                    icon: getHistoryItemIconDto(ref.icon),
                }));
                this.#proxy.$onDidChangeHistoryProviderHistoryItemRefs(this.handle, {
                    added,
                    modified,
                    removed,
                    silent: e.silent,
                });
            }));
        }
    }
    get commitTemplate() {
        return this._commitTemplate;
    }
    set commitTemplate(commitTemplate) {
        if (commitTemplate === this._commitTemplate) {
            return;
        }
        this._commitTemplate = commitTemplate;
        this.#proxy.$updateSourceControl(this.handle, { commitTemplate });
    }
    get acceptInputCommand() {
        return this._acceptInputCommand;
    }
    set acceptInputCommand(acceptInputCommand) {
        this._acceptInputDisposables.value = new DisposableStore();
        this._acceptInputCommand = acceptInputCommand;
        const internal = this._commands.converter.toInternal(acceptInputCommand, this._acceptInputDisposables.value);
        this.#proxy.$updateSourceControl(this.handle, { acceptInputCommand: internal });
    }
    get actionButton() {
        checkProposedApiEnabled(this._extension, 'scmActionButton');
        return this._actionButton;
    }
    set actionButton(actionButton) {
        checkProposedApiEnabled(this._extension, 'scmActionButton');
        // We have to do this check before converting the command to it's internal
        // representation since that would always create a command with a unique
        // identifier
        if (structuralEquals(this._actionButton, actionButton)) {
            return;
        }
        this._actionButton = actionButton;
        this._actionButtonDisposables.value = new DisposableStore();
        const actionButtonDto = actionButton !== undefined
            ? {
                command: {
                    ...this._commands.converter.toInternal(actionButton.command, this._actionButtonDisposables.value),
                    shortTitle: actionButton.command.shortTitle,
                },
                secondaryCommands: actionButton.secondaryCommands?.map((commandGroup) => {
                    return commandGroup.map((command) => this._commands.converter.toInternal(command, this._actionButtonDisposables.value));
                }),
                enabled: actionButton.enabled,
            }
            : undefined;
        this.#proxy.$updateSourceControl(this.handle, { actionButton: actionButtonDto ?? null });
    }
    get statusBarCommands() {
        return this._statusBarCommands;
    }
    set statusBarCommands(statusBarCommands) {
        if (this._statusBarCommands &&
            statusBarCommands &&
            commandListEquals(this._statusBarCommands, statusBarCommands)) {
            return;
        }
        this._statusBarDisposables.value = new DisposableStore();
        this._statusBarCommands = statusBarCommands;
        const internal = (statusBarCommands || []).map((c) => this._commands.converter.toInternal(c, this._statusBarDisposables.value));
        this.#proxy.$updateSourceControl(this.handle, { statusBarCommands: internal });
    }
    get selected() {
        return this._selected;
    }
    constructor(_extension, _extHostDocuments, proxy, _commands, _id, _label, _rootUri) {
        this._extension = _extension;
        this._commands = _commands;
        this._id = _id;
        this._label = _label;
        this._rootUri = _rootUri;
        this._groups = new Map();
        this._count = undefined;
        this._quickDiffProvider = undefined;
        this._historyProviderDisposable = new MutableDisposable();
        this._commitTemplate = undefined;
        this._acceptInputDisposables = new MutableDisposable();
        this._acceptInputCommand = undefined;
        this._actionButtonDisposables = new MutableDisposable();
        this._statusBarDisposables = new MutableDisposable();
        this._statusBarCommands = undefined;
        this._selected = false;
        this._onDidChangeSelection = new Emitter();
        this.onDidChangeSelection = this._onDidChangeSelection.event;
        this.handle = ExtHostSourceControl._handlePool++;
        this.createdResourceGroups = new Map();
        this.updatedResourceGroups = new Set();
        this.#proxy = proxy;
        const inputBoxDocumentUri = URI.from({
            scheme: Schemas.vscodeSourceControl,
            path: `${_id}/scm${this.handle}/input`,
            query: _rootUri ? `rootUri=${encodeURIComponent(_rootUri.toString())}` : undefined,
        });
        this._inputBox = new ExtHostSCMInputBox(_extension, _extHostDocuments, this.#proxy, this.handle, inputBoxDocumentUri);
        this.#proxy.$registerSourceControl(this.handle, _id, _label, _rootUri, inputBoxDocumentUri);
    }
    createResourceGroup(id, label, options) {
        const multiDiffEditorEnableViewChanges = isProposedApiEnabled(this._extension, 'scmMultiDiffEditor') &&
            options?.multiDiffEditorEnableViewChanges === true;
        const group = new ExtHostSourceControlResourceGroup(this.#proxy, this._commands, this.handle, id, label, multiDiffEditorEnableViewChanges, this._extension);
        const disposable = Event.once(group.onDidDispose)(() => this.createdResourceGroups.delete(group));
        this.createdResourceGroups.set(group, disposable);
        this.eventuallyAddResourceGroups();
        return group;
    }
    eventuallyAddResourceGroups() {
        const groups = [];
        const splices = [];
        for (const [group, disposable] of this.createdResourceGroups) {
            disposable.dispose();
            const updateListener = group.onDidUpdateResourceStates(() => {
                this.updatedResourceGroups.add(group);
                this.eventuallyUpdateResourceStates();
            });
            Event.once(group.onDidDispose)(() => {
                this.updatedResourceGroups.delete(group);
                updateListener.dispose();
                this._groups.delete(group.handle);
                this.#proxy.$unregisterGroup(this.handle, group.handle);
            });
            groups.push([
                group.handle,
                group.id,
                group.label,
                group.features,
                group.multiDiffEditorEnableViewChanges,
            ]);
            const snapshot = group._takeResourceStateSnapshot();
            if (snapshot.length > 0) {
                splices.push([group.handle, snapshot]);
            }
            this._groups.set(group.handle, group);
        }
        this.#proxy.$registerGroups(this.handle, groups, splices);
        this.createdResourceGroups.clear();
    }
    eventuallyUpdateResourceStates() {
        const splices = [];
        this.updatedResourceGroups.forEach((group) => {
            const snapshot = group._takeResourceStateSnapshot();
            if (snapshot.length === 0) {
                return;
            }
            splices.push([group.handle, snapshot]);
        });
        if (splices.length > 0) {
            this.#proxy.$spliceResourceStates(this.handle, splices);
        }
        this.updatedResourceGroups.clear();
    }
    getResourceGroup(handle) {
        return this._groups.get(handle);
    }
    setSelectionState(selected) {
        this._selected = selected;
        this._onDidChangeSelection.fire(selected);
    }
    dispose() {
        this._acceptInputDisposables.dispose();
        this._actionButtonDisposables.dispose();
        this._statusBarDisposables.dispose();
        this._groups.forEach((group) => group.dispose());
        this.#proxy.$unregisterSourceControl(this.handle);
    }
}
__decorate([
    debounce(100)
], ExtHostSourceControl.prototype, "eventuallyAddResourceGroups", null);
__decorate([
    debounce(100)
], ExtHostSourceControl.prototype, "eventuallyUpdateResourceStates", null);
let ExtHostSCM = class ExtHostSCM {
    static { ExtHostSCM_1 = this; }
    static { this._handlePool = 0; }
    get onDidChangeActiveProvider() {
        return this._onDidChangeActiveProvider.event;
    }
    constructor(mainContext, _commands, _extHostDocuments, logService) {
        this._commands = _commands;
        this._extHostDocuments = _extHostDocuments;
        this.logService = logService;
        this._sourceControls = new Map();
        this._sourceControlsByExtension = new ExtensionIdentifierMap();
        this._onDidChangeActiveProvider = new Emitter();
        this._proxy = mainContext.getProxy(MainContext.MainThreadSCM);
        this._telemetry = mainContext.getProxy(MainContext.MainThreadTelemetry);
        _commands.registerArgumentProcessor({
            processArgument: (arg) => {
                if (arg && arg.$mid === 3 /* MarshalledId.ScmResource */) {
                    const sourceControl = this._sourceControls.get(arg.sourceControlHandle);
                    if (!sourceControl) {
                        return arg;
                    }
                    const group = sourceControl.getResourceGroup(arg.groupHandle);
                    if (!group) {
                        return arg;
                    }
                    return group.getResourceState(arg.handle);
                }
                else if (arg && arg.$mid === 4 /* MarshalledId.ScmResourceGroup */) {
                    const sourceControl = this._sourceControls.get(arg.sourceControlHandle);
                    if (!sourceControl) {
                        return arg;
                    }
                    return sourceControl.getResourceGroup(arg.groupHandle);
                }
                else if (arg && arg.$mid === 5 /* MarshalledId.ScmProvider */) {
                    const sourceControl = this._sourceControls.get(arg.handle);
                    if (!sourceControl) {
                        return arg;
                    }
                    return sourceControl;
                }
                return arg;
            },
        });
    }
    createSourceControl(extension, id, label, rootUri) {
        this.logService.trace('ExtHostSCM#createSourceControl', extension.identifier.value, id, label, rootUri);
        this._telemetry.$publicLog2('api/scm/createSourceControl', {
            extensionId: extension.identifier.value,
        });
        const handle = ExtHostSCM_1._handlePool++;
        const sourceControl = new ExtHostSourceControl(extension, this._extHostDocuments, this._proxy, this._commands, id, label, rootUri);
        this._sourceControls.set(handle, sourceControl);
        const sourceControls = this._sourceControlsByExtension.get(extension.identifier) || [];
        sourceControls.push(sourceControl);
        this._sourceControlsByExtension.set(extension.identifier, sourceControls);
        return sourceControl;
    }
    // Deprecated
    getLastInputBox(extension) {
        this.logService.trace('ExtHostSCM#getLastInputBox', extension.identifier.value);
        const sourceControls = this._sourceControlsByExtension.get(extension.identifier);
        const sourceControl = sourceControls && sourceControls[sourceControls.length - 1];
        return sourceControl && sourceControl.inputBox;
    }
    $provideOriginalResource(sourceControlHandle, uriComponents, token) {
        const uri = URI.revive(uriComponents);
        this.logService.trace('ExtHostSCM#$provideOriginalResource', sourceControlHandle, uri.toString());
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl ||
            !sourceControl.quickDiffProvider ||
            !sourceControl.quickDiffProvider.provideOriginalResource) {
            return Promise.resolve(null);
        }
        return asPromise(() => sourceControl.quickDiffProvider.provideOriginalResource(uri, token)).then((r) => r || null);
    }
    $onInputBoxValueChange(sourceControlHandle, value) {
        this.logService.trace('ExtHostSCM#$onInputBoxValueChange', sourceControlHandle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        sourceControl.inputBox.$onInputBoxValueChange(value);
        return Promise.resolve(undefined);
    }
    $executeResourceCommand(sourceControlHandle, groupHandle, handle, preserveFocus) {
        this.logService.trace('ExtHostSCM#$executeResourceCommand', sourceControlHandle, groupHandle, handle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        const group = sourceControl.getResourceGroup(groupHandle);
        if (!group) {
            return Promise.resolve(undefined);
        }
        return group.$executeResourceCommand(handle, preserveFocus);
    }
    $validateInput(sourceControlHandle, value, cursorPosition) {
        this.logService.trace('ExtHostSCM#$validateInput', sourceControlHandle);
        const sourceControl = this._sourceControls.get(sourceControlHandle);
        if (!sourceControl) {
            return Promise.resolve(undefined);
        }
        if (!sourceControl.inputBox.validateInput) {
            return Promise.resolve(undefined);
        }
        return asPromise(() => sourceControl.inputBox.validateInput(value, cursorPosition)).then((result) => {
            if (!result) {
                return Promise.resolve(undefined);
            }
            const message = MarkdownString.fromStrict(result.message);
            if (!message) {
                return Promise.resolve(undefined);
            }
            return Promise.resolve([message, result.type]);
        });
    }
    $setSelectedSourceControl(selectedSourceControlHandle) {
        this.logService.trace('ExtHostSCM#$setSelectedSourceControl', selectedSourceControlHandle);
        if (selectedSourceControlHandle !== undefined) {
            this._sourceControls.get(selectedSourceControlHandle)?.setSelectionState(true);
        }
        if (this._selectedSourceControlHandle !== undefined) {
            this._sourceControls.get(this._selectedSourceControlHandle)?.setSelectionState(false);
        }
        this._selectedSourceControlHandle = selectedSourceControlHandle;
        return Promise.resolve(undefined);
    }
    async $resolveHistoryItemRefsCommonAncestor(sourceControlHandle, historyItemRefs, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const ancestor = await historyProvider?.resolveHistoryItemRefsCommonAncestor(historyItemRefs, token);
            return ancestor ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$resolveHistoryItemRefsCommonAncestor', err);
            return undefined;
        }
    }
    async $provideHistoryItemRefs(sourceControlHandle, historyItemRefs, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const refs = await historyProvider?.provideHistoryItemRefs(historyItemRefs, token);
            return refs?.map((ref) => ({ ...ref, icon: getHistoryItemIconDto(ref.icon) })) ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItemRefs', err);
            return undefined;
        }
    }
    async $provideHistoryItems(sourceControlHandle, options, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const historyItems = await historyProvider?.provideHistoryItems(options, token);
            return historyItems?.map((item) => toSCMHistoryItemDto(item)) ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItems', err);
            return undefined;
        }
    }
    async $provideHistoryItemChanges(sourceControlHandle, historyItemId, historyItemParentId, token) {
        try {
            const historyProvider = this._sourceControls.get(sourceControlHandle)?.historyProvider;
            const changes = await historyProvider?.provideHistoryItemChanges(historyItemId, historyItemParentId, token);
            return changes ?? undefined;
        }
        catch (err) {
            this.logService.error('ExtHostSCM#$provideHistoryItemChanges', err);
            return undefined;
        }
    }
};
ExtHostSCM = ExtHostSCM_1 = __decorate([
    __param(3, ILogService)
], ExtHostSCM);
export { ExtHostSCM };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNDTS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFNDTS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsaURBQWlEO0FBRWpELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEVBQ04sV0FBVyxHQWNYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFDTixzQkFBc0IsR0FFdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsb0JBQW9CLEdBQ3BCLE1BQU0sZ0RBQWdELENBQUE7QUFFdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxr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