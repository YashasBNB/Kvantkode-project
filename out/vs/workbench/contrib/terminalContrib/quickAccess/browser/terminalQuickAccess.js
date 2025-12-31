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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL3Rlcm1pbmFsUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxPQUFPLEVBRU4seUJBQXlCLEVBQ3pCLGFBQWEsR0FDYixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLHFCQUFxQixFQUVyQixnQkFBZ0IsR0FDaEIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLElBQUksYUFB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