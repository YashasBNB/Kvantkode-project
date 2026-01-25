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
var ViewQuickAccessProvider_1;
import { localize, localize2 } from '../../../../nls.js';
import { IQuickInputService, ItemActivation, } from '../../../../platform/quickinput/common/quickInput.js';
import { PickerQuickAccessProvider, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { IViewDescriptorService, } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { fuzzyContains } from '../../../../base/common/strings.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IDebugService, REPL_VIEW_ID } from '../../debug/common/debug.js';
let ViewQuickAccessProvider = class ViewQuickAccessProvider extends PickerQuickAccessProvider {
    static { ViewQuickAccessProvider_1 = this; }
    static { this.PREFIX = 'view '; }
    constructor(viewDescriptorService, viewsService, outputService, terminalService, terminalGroupService, debugService, paneCompositeService, contextKeyService) {
        super(ViewQuickAccessProvider_1.PREFIX, {
            noResultsPick: {
                label: localize('noViewResults', 'No matching views'),
                containerLabel: '',
            },
        });
        this.viewDescriptorService = viewDescriptorService;
        this.viewsService = viewsService;
        this.outputService = outputService;
        this.terminalService = terminalService;
        this.terminalGroupService = terminalGroupService;
        this.debugService = debugService;
        this.paneCompositeService = paneCompositeService;
        this.contextKeyService = contextKeyService;
    }
    _getPicks(filter) {
        const filteredViewEntries = this.doGetViewPickItems().filter((entry) => {
            if (!filter) {
                return true;
            }
            // Match fuzzy on label
            entry.highlights = { label: matchesFuzzy(filter, entry.label, true) ?? undefined };
            // Return if we have a match on label or container
            return entry.highlights.label || fuzzyContains(entry.containerLabel, filter);
        });
        // Map entries to container labels
        const mapEntryToContainer = new Map();
        for (const entry of filteredViewEntries) {
            if (!mapEntryToContainer.has(entry.label)) {
                mapEntryToContainer.set(entry.label, entry.containerLabel);
            }
        }
        // Add separators for containers
        const filteredViewEntriesWithSeparators = [];
        let lastContainer = undefined;
        for (const entry of filteredViewEntries) {
            if (lastContainer !== entry.containerLabel) {
                lastContainer = entry.containerLabel;
                // When the entry container has a parent container, set container
                // label as Parent / Child. For example, `Views / Explorer`.
                let separatorLabel;
                if (mapEntryToContainer.has(lastContainer)) {
                    separatorLabel = `${mapEntryToContainer.get(lastContainer)} / ${lastContainer}`;
                }
                else {
                    separatorLabel = lastContainer;
                }
                filteredViewEntriesWithSeparators.push({ type: 'separator', label: separatorLabel });
            }
            filteredViewEntriesWithSeparators.push(entry);
        }
        return filteredViewEntriesWithSeparators;
    }
    doGetViewPickItems() {
        const viewEntries = [];
        const getViewEntriesForPaneComposite = (paneComposite, viewContainer) => {
            const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
            const result = [];
            for (const view of viewContainerModel.allViewDescriptors) {
                if (this.contextKeyService.contextMatchesRules(view.when)) {
                    result.push({
                        label: view.name.value,
                        containerLabel: viewContainerModel.title,
                        accept: () => this.viewsService.openView(view.id, true),
                    });
                }
            }
            return result;
        };
        const addPaneComposites = (location, containerLabel) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            const visiblePaneCompositeIds = this.paneCompositeService.getVisiblePaneCompositeIds(location);
            paneComposites.sort((a, b) => {
                let aIndex = visiblePaneCompositeIds.findIndex((id) => a.id === id);
                let bIndex = visiblePaneCompositeIds.findIndex((id) => b.id === id);
                if (aIndex < 0) {
                    aIndex = paneComposites.indexOf(a) + visiblePaneCompositeIds.length;
                }
                if (bIndex < 0) {
                    bIndex = paneComposites.indexOf(b) + visiblePaneCompositeIds.length;
                }
                return aIndex - bIndex;
            });
            for (const paneComposite of paneComposites) {
                if (this.includeViewContainer(paneComposite)) {
                    const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                    if (viewContainer) {
                        viewEntries.push({
                            label: this.viewDescriptorService.getViewContainerModel(viewContainer).title,
                            containerLabel,
                            accept: () => this.paneCompositeService.openPaneComposite(paneComposite.id, location, true),
                        });
                    }
                }
            }
        };
        // Viewlets / Panels
        addPaneComposites(0 /* ViewContainerLocation.Sidebar */, localize('views', 'Side Bar'));
        addPaneComposites(1 /* ViewContainerLocation.Panel */, localize('panels', 'Panel'));
        addPaneComposites(2 /* ViewContainerLocation.AuxiliaryBar */, localize('Void side bar', 'KvantKode Side Bar'));
        const addPaneCompositeViews = (location) => {
            const paneComposites = this.paneCompositeService.getPaneComposites(location);
            for (const paneComposite of paneComposites) {
                const viewContainer = this.viewDescriptorService.getViewContainerById(paneComposite.id);
                if (viewContainer) {
                    viewEntries.push(...getViewEntriesForPaneComposite(paneComposite, viewContainer));
                }
            }
        };
        // Side Bar / Panel Views
        addPaneCompositeViews(0 /* ViewContainerLocation.Sidebar */);
        addPaneCompositeViews(1 /* ViewContainerLocation.Panel */);
        addPaneCompositeViews(2 /* ViewContainerLocation.AuxiliaryBar */);
        // Terminals
        this.terminalGroupService.groups.forEach((group, groupIndex) => {
            group.terminalInstances.forEach((terminal, terminalIndex) => {
                const label = localize('terminalTitle', '{0}: {1}', `${groupIndex + 1}.${terminalIndex + 1}`, terminal.title);
                viewEntries.push({
                    label,
                    containerLabel: localize('terminals', 'Terminal'),
                    accept: async () => {
                        await this.terminalGroupService.showPanel(true);
                        this.terminalService.setActiveInstance(terminal);
                    },
                });
            });
        });
        // Debug Consoles
        this.debugService
            .getModel()
            .getSessions(true)
            .filter((s) => s.hasSeparateRepl())
            .forEach((session, _) => {
            const label = session.name;
            viewEntries.push({
                label,
                containerLabel: localize('debugConsoles', 'Debug Console'),
                accept: async () => {
                    await this.debugService.focusStackFrame(undefined, undefined, session, {
                        explicit: true,
                    });
                    if (!this.viewsService.isViewVisible(REPL_VIEW_ID)) {
                        await this.viewsService.openView(REPL_VIEW_ID, true);
                    }
                },
            });
        });
        // Output Channels
        const channels = this.outputService.getChannelDescriptors();
        for (const channel of channels) {
            viewEntries.push({
                label: channel.label,
                containerLabel: localize('channels', 'Output'),
                accept: () => this.outputService.showChannel(channel.id),
            });
        }
        return viewEntries;
    }
    includeViewContainer(container) {
        const viewContainer = this.viewDescriptorService.getViewContainerById(container.id);
        if (viewContainer?.hideIfEmpty) {
            return (this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors
                .length > 0);
        }
        return true;
    }
};
ViewQuickAccessProvider = ViewQuickAccessProvider_1 = __decorate([
    __param(0, IViewDescriptorService),
    __param(1, IViewsService),
    __param(2, IOutputService),
    __param(3, ITerminalService),
    __param(4, ITerminalGroupService),
    __param(5, IDebugService),
    __param(6, IPaneCompositePartService),
    __param(7, IContextKeyService)
], ViewQuickAccessProvider);
export { ViewQuickAccessProvider };
//#region Actions
export class OpenViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.openView'; }
    constructor() {
        super({
            id: OpenViewPickerAction.ID,
            title: localize2('openView', 'Open View'),
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        accessor.get(IQuickInputService).quickAccess.show(ViewQuickAccessProvider.PREFIX);
    }
}
export class QuickAccessViewPickerAction extends Action2 {
    static { this.ID = 'workbench.action.quickOpenView'; }
    static { this.KEYBINDING = {
        primary: 2048 /* KeyMod.CtrlCmd */ | 47 /* KeyCode.KeyQ */,
        mac: { primary: 256 /* KeyMod.WinCtrl */ | 47 /* KeyCode.KeyQ */ },
        linux: { primary: 0 },
    }; }
    constructor() {
        super({
            id: QuickAccessViewPickerAction.ID,
            title: localize2('quickOpenView', 'Quick Open View'),
            category: Categories.View,
            f1: false, // hide quick pickers from command palette to not confuse with the other entry that shows a input field
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                when: undefined,
                ...QuickAccessViewPickerAction.KEYBINDING,
            },
        });
    }
    async run(accessor) {
        const keybindingService = accessor.get(IKeybindingService);
        const quickInputService = accessor.get(IQuickInputService);
        const keys = keybindingService.lookupKeybindings(QuickAccessViewPickerAction.ID);
        quickInputService.quickAccess.show(ViewQuickAccessProvider.PREFIX, {
            quickNavigateConfiguration: { keybindings: keys },
            itemActivation: ItemActivation.FIRST,
        });
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9xdWlja2FjY2Vzcy9icm93c2VyL3ZpZXdRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTix5QkFBeUIsR0FDekIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sc0JBQXNCLEdBR3RCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUl4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDcEcsT0FBTyxFQUFFLGFBQWEs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