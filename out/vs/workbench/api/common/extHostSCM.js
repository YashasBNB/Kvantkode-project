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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFNDTS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTQ00udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFekQsT0FBTyxFQUNOLFdBQVcsR0FjWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBR2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUVqRSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtD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