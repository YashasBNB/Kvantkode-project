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
var TerminalQuickAccessProvider_1;
import { localize } from '../../../../../nls.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { matchesFuzzy } from '../../../../../base/common/filters.js';
import { ITerminalEditorService, ITerminalGroupService, ITerminalService, } from '../../../terminal/browser/terminal.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { killTerminalIcon, renameTerminalIcon } from '../../../terminal/browser/terminalIcons.js';
import { getColorClass, getIconId, getUriClasses } from '../../../terminal/browser/terminalIcon.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { TerminalLocation } from '../../../../../platform/terminal/common/terminal.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
let terminalPicks = [];
let TerminalQuickAccessProvider = class TerminalQuickAccessProvider extends PickerQuickAccessProvider {
    static { TerminalQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'term '; }
    constructor(_commandService, _editorService, _instantiationService, _terminalEditorService, _terminalGroupService, _terminalService, _themeService) {
        super(TerminalQuickAccessProvider_1.PREFIX, { canAcceptInBackground: true });
        this._commandService = _commandService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._terminalEditorService = _terminalEditorService;
        this._terminalGroupService = _terminalGroupService;
        this._terminalService = _terminalService;
        this._themeService = _themeService;
    }
    _getPicks(filter) {
        terminalPicks = [];
        terminalPicks.push({ type: 'separator', label: 'panel' });
        const terminalGroups = this._terminalGroupService.groups;
        for (let groupIndex = 0; groupIndex < terminalGroups.length; groupIndex++) {
            const terminalGroup = terminalGroups[groupIndex];
            for (let terminalIndex = 0; terminalIndex < terminalGroup.terminalInstances.length; terminalIndex++) {
                const terminal = terminalGroup.terminalInstances[terminalIndex];
                const pick = this._createPick(terminal, terminalIndex, filter, {
                    groupIndex,
                    groupSize: terminalGroup.terminalInstances.length,
                });
                if (pick) {
                    terminalPicks.push(pick);
                }
            }
        }
        if (terminalPicks.length > 0) {
            terminalPicks.push({ type: 'separator', label: 'editor' });
        }
        const terminalEditors = this._terminalEditorService.instances;
        for (let editorIndex = 0; editorIndex < terminalEditors.length; editorIndex++) {
            const term = terminalEditors[editorIndex];
            term.target = TerminalLocation.Editor;
            const pick = this._createPick(term, editorIndex, filter);
            if (pick) {
                terminalPicks.push(pick);
            }
        }
        if (terminalPicks.length > 0) {
            terminalPicks.push({ type: 'separator' });
        }
        const createTerminalLabel = localize('workbench.action.terminal.newplus', 'Create New Terminal');
        terminalPicks.push({
            label: `$(plus) ${createTerminalLabel}`,
            ariaLabel: createTerminalLabel,
            accept: () => this._commandService.executeCommand("workbench.action.terminal.new" /* TerminalCommandId.New */),
        });
        const createWithProfileLabel = localize('workbench.action.terminal.newWithProfilePlus', 'Create New Terminal With Profile...');
        terminalPicks.push({
            label: `$(plus) ${createWithProfileLabel}`,
            ariaLabel: createWithProfileLabel,
            accept: () => this._commandService.executeCommand("workbench.action.terminal.newWithProfile" /* TerminalCommandId.NewWithProfile */),
        });
        return terminalPicks;
    }
    _createPick(terminal, terminalIndex, filter, groupInfo) {
        const iconId = this._instantiationService.invokeFunction(getIconId, terminal);
        const index = groupInfo
            ? groupInfo.groupSize > 1
                ? `${groupInfo.groupIndex + 1}.${terminalIndex + 1}`
                : `${groupInfo.groupIndex + 1}`
            : `${terminalIndex + 1}`;
        const label = `$(${iconId}) ${index}: ${terminal.title}`;
        const iconClasses = [];
        const colorClass = getColorClass(terminal);
        if (colorClass) {
            iconClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(terminal, this._themeService.getColorTheme().type);
        if (uriClasses) {
            iconClasses.push(...uriClasses);
        }
        const highlights = matchesFuzzy(filter, label, true);
        if (highlights) {
            return {
                label,
                description: terminal.description,
                highlights: { label: highlights },
                buttons: [
                    {
                        iconClass: ThemeIcon.asClassName(renameTerminalIcon),
                        tooltip: localize('renameTerminal', 'Rename Terminal'),
                    },
                    {
                        iconClass: ThemeIcon.asClassName(killTerminalIcon),
                        tooltip: terminalStrings.kill.value,
                    },
                ],
                iconClasses,
                trigger: (buttonIndex) => {
                    switch (buttonIndex) {
                        case 0:
                            this._commandService.executeCommand("workbench.action.terminal.rename" /* TerminalCommandId.Rename */, terminal);
                            return TriggerAction.NO_ACTION;
                        case 1:
                            this._terminalService.safeDisposeTerminal(terminal);
                            return TriggerAction.REMOVE_ITEM;
                    }
                    return TriggerAction.NO_ACTION;
                },
                accept: (keyMod, event) => {
                    if (terminal.target === TerminalLocation.Editor) {
                        const existingEditors = this._editorService.findEditors(terminal.resource);
                        this._terminalEditorService.openEditor(terminal, {
                            viewColumn: existingEditors?.[0].groupId,
                        });
                        this._terminalEditorService.setActiveInstance(terminal);
                    }
                    else {
                        this._terminalGroupService.showPanel(!event.inBackground);
                        this._terminalGroupService.setActiveInstance(terminal);
                    }
                },
            };
        }
        return undefined;
    }
};
TerminalQuickAccessProvider = TerminalQuickAccessProvider_1 = __decorate([
    __param(0, ICommandService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, ITerminalEditorService),
    __param(4, ITerminalGroupService),
    __param(5, ITerminalService),
    __param(6, IThemeService)
], TerminalQuickAccessProvider);
export { TerminalQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3F1aWNrQWNjZXNzL2Jyb3dzZXIvdGVybWluYWxRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhELE9BQU8sRUFFTix5QkFBeUIsRUFDekIsYUFBYSxHQUNiLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIscUJBQXFCLEVBRXJCLGdCQUFnQixHQUNoQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsSUFB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