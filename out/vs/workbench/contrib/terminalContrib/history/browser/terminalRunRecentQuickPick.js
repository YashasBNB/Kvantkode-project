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
var TerminalOutputProvider_1;
import { Toggle } from '../../../../../base/browser/ui/toggle/toggle.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService, } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, } from '../../../../../platform/quickinput/common/quickInput.js';
import { collapseTildePath } from '../../../../../platform/terminal/common/terminalEnvironment.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground, } from '../../../../../platform/theme/common/colorRegistry.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { commandHistoryFuzzySearchIcon, commandHistoryOpenFileIcon, commandHistoryOutputIcon, commandHistoryRemoveIcon, } from '../../../terminal/browser/terminalIcons.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { URI } from '../../../../../base/common/uri.js';
import { fromNow } from '../../../../../base/common/date.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { showWithPinnedItems } from '../../../../../platform/quickinput/browser/quickPickPin.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IAccessibleViewService, } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getCommandHistory, getDirectoryHistory, getShellFileHistory } from '../common/history.js';
export async function showRunRecentQuickPick(accessor, instance, terminalInRunCommandPicker, type, filterMode, value) {
    if (!instance.xterm) {
        return;
    }
    const accessibleViewService = accessor.get(IAccessibleViewService);
    const editorService = accessor.get(IEditorService);
    const instantiationService = accessor.get(IInstantiationService);
    const quickInputService = accessor.get(IQuickInputService);
    const storageService = accessor.get(IStorageService);
    const runRecentStorageKey = `${"terminal.pinnedRecentCommands" /* TerminalStorageKeys.PinnedRecentCommandsPrefix */}.${instance.shellType}`;
    let placeholder;
    let items = [];
    const commandMap = new Set();
    const removeFromCommandHistoryButton = {
        iconClass: ThemeIcon.asClassName(commandHistoryRemoveIcon),
        tooltip: localize('removeCommand', 'Remove from Command History'),
    };
    const commandOutputButton = {
        iconClass: ThemeIcon.asClassName(commandHistoryOutputIcon),
        tooltip: localize('viewCommandOutput', 'View Command Output'),
        alwaysVisible: false,
    };
    const openResourceButtons = [];
    if (type === 'command') {
        placeholder = isMacintosh
            ? localize('selectRecentCommandMac', 'Select a command to run (hold Option-key to edit the command)')
            : localize('selectRecentCommand', 'Select a command to run (hold Alt-key to edit the command)');
        const cmdDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = cmdDetection?.commands;
        // Current session history
        const executingCommand = cmdDetection?.executingCommand;
        if (executingCommand) {
            commandMap.add(executingCommand);
        }
        function formatLabel(label) {
            return (label
                // Replace new lines with "enter" symbol
                .replace(/\r?\n/g, '\u23CE')
                // Replace 3 or more spaces with midline horizontal ellipsis which looks similar
                // to whitespace in the editor
                .replace(/\s\s\s+/g, '\u22EF'));
        }
        if (commands && commands.length > 0) {
            for (const entry of commands) {
                // Trim off any whitespace and/or line endings, replace new lines with the
                // Downwards Arrow with Corner Leftwards symbol
                const label = entry.command.trim();
                if (label.length === 0 || commandMap.has(label)) {
                    continue;
                }
                let description = collapseTildePath(entry.cwd, instance.userHome, instance.os === 1 /* OperatingSystem.Windows */ ? '\\' : '/');
                if (entry.exitCode) {
                    // Since you cannot get the last command's exit code on pwsh, just whether it failed
                    // or not, -1 is treated specially as simply failed
                    if (entry.exitCode === -1) {
                        description += ' failed';
                    }
                    else {
                        description += ` exitCode: ${entry.exitCode}`;
                    }
                }
                description = description.trim();
                const buttons = [commandOutputButton];
                // Merge consecutive commands
                const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
                if (lastItem?.type !== 'separator' && lastItem?.label === label) {
                    lastItem.id = entry.timestamp.toString();
                    lastItem.description = description;
                    continue;
                }
                items.push({
                    label: formatLabel(label),
                    rawLabel: label,
                    description,
                    id: entry.timestamp.toString(),
                    command: entry,
                    buttons: entry.hasOutput() ? buttons : undefined,
                });
                commandMap.add(label);
            }
            items = items.reverse();
        }
        if (executingCommand) {
            items.unshift({
                label: formatLabel(executingCommand),
                rawLabel: executingCommand,
                description: cmdDetection.cwd,
            });
        }
        if (items.length > 0) {
            items.unshift({
                type: 'separator',
                buttons: [], // HACK: Force full sized separators as there's no flag currently
                label: terminalStrings.currentSessionCategory,
            });
        }
        // Gather previous session history
        const history = instantiationService.invokeFunction(getCommandHistory);
        const previousSessionItems = [];
        for (const [label, info] of history.entries) {
            // Only add previous session item if it's not in this session
            if (!commandMap.has(label) && info.shellType === instance.shellType) {
                previousSessionItems.unshift({
                    label: formatLabel(label),
                    rawLabel: label,
                    buttons: [removeFromCommandHistoryButton],
                });
                commandMap.add(label);
            }
        }
        if (previousSessionItems.length > 0) {
            items.push({
                type: 'separator',
                buttons: [], // HACK: Force full sized separators as there's no flag currently
                label: terminalStrings.previousSessionCategory,
            }, ...previousSessionItems);
        }
        // Gather shell file history
        const shellFileHistory = await instantiationService.invokeFunction(getShellFileHistory, instance.shellType);
        if (shellFileHistory !== undefined) {
            const dedupedShellFileItems = [];
            for (const label of shellFileHistory.commands) {
                if (!commandMap.has(label)) {
                    dedupedShellFileItems.unshift({
                        label: formatLabel(label),
                        rawLabel: label,
                    });
                }
            }
            if (dedupedShellFileItems.length > 0) {
                const button = {
                    iconClass: ThemeIcon.asClassName(commandHistoryOpenFileIcon),
                    tooltip: localize('openShellHistoryFile', 'Open File'),
                    alwaysVisible: false,
                    resource: shellFileHistory.sourceResource,
                };
                openResourceButtons.push(button);
                items.push({
                    type: 'separator',
                    buttons: [button],
                    label: localize('shellFileHistoryCategory', '{0} history', instance.shellType),
                    description: shellFileHistory.sourceLabel,
                }, ...dedupedShellFileItems);
            }
        }
    }
    else {
        placeholder = isMacintosh
            ? localize('selectRecentDirectoryMac', 'Select a directory to go to (hold Option-key to edit the command)')
            : localize('selectRecentDirectory', 'Select a directory to go to (hold Alt-key to edit the command)');
        const cwds = instance.capabilities.get(0 /* TerminalCapability.CwdDetection */)?.cwds || [];
        if (cwds && cwds.length > 0) {
            for (const label of cwds) {
                items.push({ label, rawLabel: label });
            }
            items = items.reverse();
            items.unshift({ type: 'separator', label: terminalStrings.currentSessionCategory });
        }
        // Gather previous session history
        const history = instantiationService.invokeFunction(getDirectoryHistory);
        const previousSessionItems = [];
        // Only add previous session item if it's not in this session and it matches the remote authority
        for (const [label, info] of history.entries) {
            if ((info === null || info.remoteAuthority === instance.remoteAuthority) &&
                !cwds.includes(label)) {
                previousSessionItems.unshift({
                    label,
                    rawLabel: label,
                    buttons: [removeFromCommandHistoryButton],
                });
            }
        }
        if (previousSessionItems.length > 0) {
            items.push({ type: 'separator', label: terminalStrings.previousSessionCategory }, ...previousSessionItems);
        }
    }
    if (items.length === 0) {
        return;
    }
    const disposables = new DisposableStore();
    const fuzzySearchToggle = disposables.add(new Toggle({
        title: 'Fuzzy search',
        icon: commandHistoryFuzzySearchIcon,
        isChecked: filterMode === 'fuzzy',
        inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
        inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
    }));
    disposables.add(fuzzySearchToggle.onChange(() => {
        instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, fuzzySearchToggle.checked ? 'fuzzy' : 'contiguous', quickPick.value);
    }));
    const outputProvider = disposables.add(instantiationService.createInstance(TerminalOutputProvider));
    const quickPick = disposables.add(quickInputService.createQuickPick({
        useSeparators: true,
    }));
    const originalItems = items;
    quickPick.items = [...originalItems];
    quickPick.sortByLabel = false;
    quickPick.placeholder = placeholder;
    quickPick.matchOnLabelMode = filterMode || 'contiguous';
    quickPick.toggles = [fuzzySearchToggle];
    disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button === removeFromCommandHistoryButton) {
            if (type === 'command') {
                instantiationService.invokeFunction(getCommandHistory)?.remove(e.item.label);
            }
            else {
                instantiationService.invokeFunction(getDirectoryHistory)?.remove(e.item.label);
            }
        }
        else if (e.button === commandOutputButton) {
            const selectedCommand = e.item.command;
            const output = selectedCommand?.getOutput();
            if (output && selectedCommand?.command) {
                const textContent = await outputProvider.provideTextContent(URI.from({
                    scheme: TerminalOutputProvider.scheme,
                    path: `${selectedCommand.command}... ${fromNow(selectedCommand.timestamp, true)}`,
                    fragment: output,
                    query: `terminal-output-${selectedCommand.timestamp}-${instance.instanceId}`,
                }));
                if (textContent) {
                    await editorService.openEditor({
                        resource: textContent.uri,
                    });
                }
            }
        }
        await instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, filterMode, value);
    }));
    disposables.add(quickPick.onDidTriggerSeparatorButton(async (e) => {
        const resource = openResourceButtons.find((openResourceButton) => e.button === openResourceButton)?.resource;
        if (resource) {
            await editorService.openEditor({
                resource,
            });
        }
    }));
    disposables.add(quickPick.onDidChangeValue(async (value) => {
        if (!value) {
            await instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, filterMode, value);
        }
    }));
    let terminalScrollStateSaved = false;
    function restoreScrollState() {
        terminalScrollStateSaved = false;
        instance.xterm?.markTracker.restoreScrollState();
        instance.xterm?.markTracker.clear();
    }
    disposables.add(quickPick.onDidChangeActive(async () => {
        const xterm = instance.xterm;
        if (!xterm) {
            return;
        }
        const [item] = quickPick.activeItems;
        if (!item) {
            return;
        }
        if ('command' in item && item.command && item.command.marker) {
            if (!terminalScrollStateSaved) {
                xterm.markTracker.saveScrollState();
                terminalScrollStateSaved = true;
            }
            const promptRowCount = item.command.getPromptRowCount();
            const commandRowCount = item.command.getCommandRowCount();
            xterm.markTracker.revealRange({
                start: {
                    x: 1,
                    y: item.command.marker.line - (promptRowCount - 1) + 1,
                },
                end: {
                    x: instance.cols,
                    y: item.command.marker.line + (commandRowCount - 1) + 1,
                },
            });
        }
        else {
            restoreScrollState();
        }
    }));
    disposables.add(quickPick.onDidAccept(async () => {
        const result = quickPick.activeItems[0];
        let text;
        if (type === 'cwd') {
            text = `cd ${await instance.preparePathForShell(result.rawLabel)}`;
        }
        else {
            // command
            text = result.rawLabel;
        }
        quickPick.hide();
        terminalScrollStateSaved = false;
        instance.xterm?.markTracker.clear();
        instance.scrollToBottom();
        instance.runCommand(text, !quickPick.keyMods.alt);
        if (quickPick.keyMods.alt) {
            instance.focus();
        }
    }));
    disposables.add(quickPick.onDidHide(() => restoreScrollState()));
    if (value) {
        quickPick.value = value;
    }
    return new Promise((r) => {
        terminalInRunCommandPicker.set(true);
        disposables.add(showWithPinnedItems(storageService, runRecentStorageKey, quickPick, true));
        disposables.add(quickPick.onDidHide(() => {
            terminalInRunCommandPicker.set(false);
            accessibleViewService.showLastProvider("terminal" /* AccessibleViewProviderId.Terminal */);
            r();
            disposables.dispose();
        }));
    });
}
let TerminalOutputProvider = class TerminalOutputProvider extends Disposable {
    static { TerminalOutputProvider_1 = this; }
    static { this.scheme = 'TERMINAL_OUTPUT'; }
    constructor(textModelResolverService, _modelService) {
        super();
        this._modelService = _modelService;
        this._register(textModelResolverService.registerTextModelContentProvider(TerminalOutputProvider_1.scheme, this));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, null, resource, false);
    }
};
TerminalOutputProvider = TerminalOutputProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], TerminalOutputProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSdW5SZWNlbnRRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS9icm93c2VyL3Rlcm1pbmFsUnVuUmVjZW50UXVpY2tQaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUVOLGtCQUFrQixHQUdsQixNQUFNLHlEQUF5RCxDQUFBO0FBS2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ2xHLE9BQU8sRUFDTixhQUFhLEVBQ2IsMkJBQTJCLEVBQzNCLHVCQUF1QixFQUN2QiwyQkFBMkIsR0FDM0IsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbkUsT0FBTyxFQUNOLDZCQUE2QixFQUM3QiwwQkFBMEIsRUFDMUIsd0JBQXdCLEVBQ3hCLHdCQUF3QixHQUN4QixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNB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