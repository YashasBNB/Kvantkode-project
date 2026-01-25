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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSdW5SZWNlbnRRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9oaXN0b3J5L2Jyb3dzZXIvdGVybWluYWxSdW5SZWNlbnRRdWlja1BpY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFtQixNQUFNLHdDQUF3QyxDQUFBO0FBRXJGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBRU4sa0JBQWtCLEdBR2xCLE1BQU0seURBQXlELENBQUE7QUFLaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUNOLGFBQWEsRUFDYiwyQkFBMkIsRUFDM0IsdUJBQXVCLEVBQ3ZCLDJCQUEyQixHQUMzQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVuRSxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDBCQUEwQixFQUMxQix3QkFBd0IsRUFDeEIsd0JBQXdCLEdBQ3hCLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVuRixPQUFPLEVBRU4sc0JBQXNCLEdBQ3RCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUVsRyxNQUFNLENBQUMsS0FBSyxVQUFVLHNCQUFzQixDQUMzQyxRQUEwQixFQUMxQixRQUEyQixFQUMzQiwwQkFBZ0QsRUFDaEQsSUFBdUIsRUFDdkIsVUFBbUMsRUFDbkMsS0FBYztJQUVkLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDckIsT0FBTTtJQUNQLENBQUM7SUFFRCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2xELE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzFELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7SUFFcEQsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLG9GQUE4QyxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNyRyxJQUFJLFdBQW1CLENBQUE7SUFFdkIsSUFBSSxLQUFLLEdBQTZFLEVBQUUsQ0FBQTtJQUN4RixNQUFNLFVBQVUsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLDhCQUE4QixHQUFzQjtRQUN6RCxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQztRQUMxRCxPQUFPLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSw2QkFBNkIsQ0FBQztLQUNqRSxDQUFBO0lBRUQsTUFBTSxtQkFBbUIsR0FBc0I7UUFDOUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUM7UUFDMUQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSxxQkFBcUIsQ0FBQztRQUM3RCxhQUFhLEVBQUUsS0FBSztLQUNwQixDQUFBO0lBRUQsTUFBTSxtQkFBbUIsR0FBOEMsRUFBRSxDQUFBO0lBRXpFLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO1FBQ3hCLFdBQVcsR0FBRyxXQUFXO1lBQ3hCLENBQUMsQ0FBQyxRQUFRLENBQ1Isd0JBQXdCLEVBQ3hCLCtEQUErRCxDQUMvRDtZQUNGLENBQUMsQ0FBQyxRQUFRLENBQ1IscUJBQXFCLEVBQ3JCLDREQUE0RCxDQUM1RCxDQUFBO1FBQ0gsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxDQUFBO1FBQ25GLE1BQU0sUUFBUSxHQUFHLFlBQVksRUFBRSxRQUFRLENBQUE7UUFDdkMsMEJBQTBCO1FBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxFQUFFLGdCQUFnQixDQUFBO1FBQ3ZELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDakMsQ0FBQztRQUNELFNBQVMsV0FBVyxDQUFDLEtBQWE7WUFDakMsT0FBTyxDQUNOLEtBQUs7Z0JBQ0osd0NBQXdDO2lCQUN2QyxPQUFPLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQztnQkFDNUIsZ0ZBQWdGO2dCQUNoRiw4QkFBOEI7aUJBQzdCLE9BQU8sQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQy9CLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUM5QiwwRUFBMEU7Z0JBQzFFLCtDQUErQztnQkFDL0MsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDbEMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2pELFNBQVE7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLFdBQVcsR0FBRyxpQkFBaUIsQ0FDbEMsS0FBSyxDQUFDLEdBQUcsRUFDVCxRQUFRLENBQUMsUUFBUSxFQUNqQixRQUFRLENBQUMsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQ3BELENBQUE7Z0JBQ0QsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3BCLG9GQUFvRjtvQkFDcEYsbURBQW1EO29CQUNuRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0IsV0FBVyxJQUFJLFNBQVMsQ0FBQTtvQkFDekIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFdBQVcsSUFBSSxjQUFjLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtvQkFDOUMsQ0FBQztnQkFDRixDQUFDO2dCQUNELFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ2hDLE1BQU0sT0FBTyxHQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUE7Z0JBQzFELDZCQUE2QjtnQkFDN0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ3ZFLElBQUksUUFBUSxFQUFFLElBQUksS0FBSyxXQUFXLElBQUksUUFBUSxFQUFFLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDakUsUUFBUSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFBO29CQUN4QyxRQUFRLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtvQkFDbEMsU0FBUTtnQkFDVCxDQUFDO2dCQUNELEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1YsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQ3pCLFFBQVEsRUFBRSxLQUFLO29CQUNmLFdBQVc7b0JBQ1gsRUFBRSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUM5QixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7aUJBQ2hELENBQUMsQ0FBQTtnQkFDRixVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3RCLENBQUM7WUFDRCxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3hCLENBQUM7UUFDRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQztnQkFDYixLQUFLLEVBQUUsV0FBVyxDQUFDLGdCQUFnQixDQUFDO2dCQUNwQyxRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixXQUFXLEVBQUUsWUFBWSxDQUFDLEdBQUc7YUFDN0IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUNiLElBQUksRUFBRSxXQUFXO2dCQUNqQixPQUFPLEVBQUUsRUFBRSxFQUFFLGlFQUFpRTtnQkFDOUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0I7YUFDN0MsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUN0RSxNQUFNLG9CQUFvQixHQUE4QyxFQUFFLENBQUE7UUFDMUUsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM3Qyw2REFBNkQ7WUFDN0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ3JFLG9CQUFvQixDQUFDLE9BQU8sQ0FBQztvQkFDNUIsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQ3pCLFFBQVEsRUFBRSxLQUFLO29CQUNmLE9BQU8sRUFBRSxDQUFDLDhCQUE4QixDQUFDO2lCQUN6QyxDQUFDLENBQUE7Z0JBQ0YsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLEtBQUssQ0FBQyxJQUFJLENBQ1Q7Z0JBQ0MsSUFBSSxFQUFFLFdBQVc7Z0JBQ2pCLE9BQU8sRUFBRSxFQUFFLEVBQUUsaUVBQWlFO2dCQUM5RSxLQUFLLEVBQUUsZUFBZSxDQUFDLHVCQUF1QjthQUM5QyxFQUNELEdBQUcsb0JBQW9CLENBQ3ZCLENBQUE7UUFDRixDQUFDO1FBRUQsNEJBQTRCO1FBQzVCLE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQ2pFLG1CQUFtQixFQUNuQixRQUFRLENBQUMsU0FBUyxDQUNsQixDQUFBO1FBQ0QsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNwQyxNQUFNLHFCQUFxQixHQUE4QyxFQUFFLENBQUE7WUFDM0UsS0FBSyxNQUFNLEtBQUssSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDNUIscUJBQXFCLENBQUMsT0FBTyxDQUFDO3dCQUM3QixLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUssQ0FBQzt3QkFDekIsUUFBUSxFQUFFLEtBQUs7cUJBQ2YsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBQ0QsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sTUFBTSxHQUEwQztvQkFDckQsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsMEJBQTBCLENBQUM7b0JBQzVELE9BQU8sRUFBRSxRQUFRLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxDQUFDO29CQUN0RCxhQUFhLEVBQUUsS0FBSztvQkFDcEIsUUFBUSxFQUFFLGdCQUFnQixDQUFDLGNBQWM7aUJBQ3pDLENBQUE7Z0JBQ0QsbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNoQyxLQUFLLENBQUMsSUFBSSxDQUNUO29CQUNDLElBQUksRUFBRSxXQUFXO29CQUNqQixPQUFPLEVBQUUsQ0FBQyxNQUFNLENBQUM7b0JBQ2pCLEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUM7b0JBQzlFLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxXQUFXO2lCQUN6QyxFQUNELEdBQUcscUJBQXFCLENBQ3hCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7U0FBTSxDQUFDO1FBQ1AsV0FBVyxHQUFHLFdBQVc7WUFDeEIsQ0FBQyxDQUFDLFFBQVEsQ0FDUiwwQkFBMEIsRUFDMUIsbUVBQW1FLENBQ25FO1lBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FDUix1QkFBdUIsRUFDdkIsZ0VBQWdFLENBQ2hFLENBQUE7UUFDSCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcseUNBQWlDLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUNuRixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQzFCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDdkMsQ0FBQztZQUNELEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDdkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUE7UUFDcEYsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUN4RSxNQUFNLG9CQUFvQixHQUE4QyxFQUFFLENBQUE7UUFDMUUsaUdBQWlHO1FBQ2pHLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0MsSUFDQyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUMsZUFBZSxDQUFDO2dCQUNwRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQ3BCLENBQUM7Z0JBQ0Ysb0JBQW9CLENBQUMsT0FBTyxDQUFDO29CQUM1QixLQUFLO29CQUNMLFFBQVEsRUFBRSxLQUFLO29CQUNmLE9BQU8sRUFBRSxDQUFDLDhCQUE4QixDQUFDO2lCQUN6QyxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksb0JBQW9CLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLEtBQUssQ0FBQyxJQUFJLENBQ1QsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsdUJBQXVCLEVBQUUsRUFDckUsR0FBRyxvQkFBb0IsQ0FDdkIsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU07SUFDUCxDQUFDO0lBQ0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3hDLElBQUksTUFBTSxDQUFDO1FBQ1YsS0FBSyxFQUFFLGNBQWM7UUFDckIsSUFBSSxFQUFFLDZCQUE2QjtRQUNuQyxTQUFTLEVBQUUsVUFBVSxLQUFLLE9BQU87UUFDakMsdUJBQXVCLEVBQUUsYUFBYSxDQUFDLHVCQUF1QixDQUFDO1FBQy9ELDJCQUEyQixFQUFFLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQztRQUN2RSwyQkFBMkIsRUFBRSxhQUFhLENBQUMsMkJBQTJCLENBQUM7S0FDdkUsQ0FBQyxDQUNGLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDL0Isb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxzQkFBc0IsRUFDdEIsUUFBUSxFQUNSLDBCQUEwQixFQUMxQixJQUFJLEVBQ0osaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFDbEQsU0FBUyxDQUFDLEtBQUssQ0FDZixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNELE1BQU0sY0FBYyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3JDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUMzRCxDQUFBO0lBQ0QsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDaEMsaUJBQWlCLENBQUMsZUFBZSxDQUFpRDtRQUNqRixhQUFhLEVBQUUsSUFBSTtLQUNuQixDQUFDLENBQ0YsQ0FBQTtJQUNELE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQTtJQUMzQixTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxhQUFhLENBQUMsQ0FBQTtJQUNwQyxTQUFTLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtJQUM3QixTQUFTLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtJQUNuQyxTQUFTLENBQUMsZ0JBQWdCLEdBQUcsVUFBVSxJQUFJLFlBQVksQ0FBQTtJQUN2RCxTQUFTLENBQUMsT0FBTyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUN2QyxXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDNUMsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLDhCQUE4QixFQUFFLENBQUM7WUFDakQsSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3hCLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzdFLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvRSxDQUFDO1FBQ0YsQ0FBQzthQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxtQkFBbUIsRUFBRSxDQUFDO1lBQzdDLE1BQU0sZUFBZSxHQUFJLENBQUMsQ0FBQyxJQUFhLENBQUMsT0FBTyxDQUFBO1lBQ2hELE1BQU0sTUFBTSxHQUFHLGVBQWUsRUFBRSxTQUFTLEVBQUUsQ0FBQTtZQUMzQyxJQUFJLE1BQU0sSUFBSSxlQUFlLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sV0FBVyxHQUFHLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixDQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDO29CQUNSLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxNQUFNO29CQUNyQyxJQUFJLEVBQUUsR0FBRyxlQUFlLENBQUMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFO29CQUNqRixRQUFRLEVBQUUsTUFBTTtvQkFDaEIsS0FBSyxFQUFFLG1CQUFtQixlQUFlLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUU7aUJBQzVFLENBQUMsQ0FDRixDQUFBO2dCQUNELElBQUksV0FBVyxFQUFFLENBQUM7b0JBQ2pCLE1BQU0sYUFBYSxDQUFDLFVBQVUsQ0FBQzt3QkFDOUIsUUFBUSxFQUFFLFdBQVcsQ0FBQyxHQUFHO3FCQUN6QixDQUFDLENBQUE7Z0JBQ0gsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQ3hDLHNCQUFzQixFQUN0QixRQUFRLEVBQ1IsMEJBQTBCLEVBQzFCLElBQUksRUFDSixVQUFVLEVBQ1YsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FDZCxTQUFTLENBQUMsMkJBQTJCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ2pELE1BQU0sUUFBUSxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FDeEMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxrQkFBa0IsQ0FDdkQsRUFBRSxRQUFRLENBQUE7UUFDWCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsTUFBTSxhQUFhLENBQUMsVUFBVSxDQUFDO2dCQUM5QixRQUFRO2FBQ1IsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQ3hDLHNCQUFzQixFQUN0QixRQUFRLEVBQ1IsMEJBQTBCLEVBQzFCLElBQUksRUFDSixVQUFVLEVBQ1YsS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNELElBQUksd0JBQXdCLEdBQUcsS0FBSyxDQUFBO0lBQ3BDLFNBQVMsa0JBQWtCO1FBQzFCLHdCQUF3QixHQUFHLEtBQUssQ0FBQTtRQUNoQyxRQUFRLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ2hELFFBQVEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BDLENBQUM7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUN0QyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUE7UUFDcEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLFNBQVMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUMvQixLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFBO2dCQUNuQyx3QkFBd0IsR0FBRyxJQUFJLENBQUE7WUFDaEMsQ0FBQztZQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtZQUN2RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUE7WUFDekQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7Z0JBQzdCLEtBQUssRUFBRTtvQkFDTixDQUFDLEVBQUUsQ0FBQztvQkFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7aUJBQ3REO2dCQUNELEdBQUcsRUFBRTtvQkFDSixDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUk7b0JBQ2hCLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztpQkFDdkQ7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixFQUFFLENBQUE7UUFDckIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2QyxJQUFJLElBQVksQ0FBQTtRQUNoQixJQUFJLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwQixJQUFJLEdBQUcsTUFBTSxNQUFNLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQTtRQUNuRSxDQUFDO2FBQU0sQ0FBQztZQUNQLFVBQVU7WUFDVixJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUN2QixDQUFDO1FBQ0QsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQ2hCLHdCQUF3QixHQUFHLEtBQUssQ0FBQTtRQUNoQyxRQUFRLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNuQyxRQUFRLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDekIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2pELElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMzQixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDaEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLFNBQVMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDOUIsMEJBQTBCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BDLFdBQVcsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLG1CQUFtQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzFGLFdBQVcsQ0FBQyxHQUFHLENBQ2QsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7WUFDeEIsMEJBQTBCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3JDLHFCQUFxQixDQUFDLGdCQUFnQixvREFBbUMsQ0FBQTtZQUN6RSxDQUFDLEVBQUUsQ0FBQTtZQUNILFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN0QixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxVQUFVOzthQUN2QyxXQUFNLEdBQUcsaUJBQWlCLEFBQXBCLENBQW9CO0lBRWpDLFlBQ29CLHdCQUEyQyxFQUM5QixhQUE0QjtRQUU1RCxLQUFLLEVBQUUsQ0FBQTtRQUZ5QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUc1RCxJQUFJLENBQUMsU0FBUyxDQUNiLHdCQUF3QixDQUFDLGdDQUFnQyxDQUN4RCx3QkFBc0IsQ0FBQyxNQUFNLEVBQzdCLElBQUksQ0FDSixDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWE7UUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEQsSUFBSSxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUN4QyxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDaEYsQ0FBQzs7QUF2Qkksc0JBQXNCO0lBSXpCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7R0FMVixzQkFBc0IsQ0F3QjNCIn0=