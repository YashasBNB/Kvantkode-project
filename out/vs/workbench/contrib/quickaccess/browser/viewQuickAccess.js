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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcXVpY2thY2Nlc3MvYnJvd3Nlci92aWV3UXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUVOLGtCQUFrQixFQUNsQixjQUFjLEdBQ2QsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4seUJBQXlCLEdBQ3pCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUNOLHNCQUFzQixHQUd0QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFJeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFNbEUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSx5QkFBNkM7O2FBQ2xGLFdBQU0sR0FBRyxPQUFPLEFBQVYsQ0FBVTtJQUV2QixZQUMwQyxxQkFBNkMsRUFDdEQsWUFBMkIsRUFDMUIsYUFBNkIsRUFDM0IsZUFBaUMsRUFDNUIsb0JBQTJDLEVBQ25ELFlBQTJCLEVBQ2Ysb0JBQStDLEVBQ3RELGlCQUFxQztRQUUxRSxLQUFLLENBQUMseUJBQXVCLENBQUMsTUFBTSxFQUFFO1lBQ3JDLGFBQWEsRUFBRTtnQkFDZCxLQUFLLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQztnQkFDckQsY0FBYyxFQUFFLEVBQUU7YUFDbEI7U0FDRCxDQUFDLENBQUE7UUFkdUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUN0RCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMxQixrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDM0Isb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzVCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbkQsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDZix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTJCO1FBQ3RELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFRM0UsQ0FBQztJQUVTLFNBQVMsQ0FBQyxNQUFjO1FBQ2pDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDdEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUVELHVCQUF1QjtZQUN2QixLQUFLLENBQUMsVUFBVSxHQUFHLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQTtZQUVsRixrREFBa0Q7WUFDbEQsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxhQUFhLENBQUMsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM3RSxDQUFDLENBQUMsQ0FBQTtRQUVGLGtDQUFrQztRQUNsQyxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO1FBQ3JELEtBQUssTUFBTSxLQUFLLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUE7WUFDM0QsQ0FBQztRQUNGLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsTUFBTSxpQ0FBaUMsR0FBb0QsRUFBRSxDQUFBO1FBQzdGLElBQUksYUFBYSxHQUF1QixTQUFTLENBQUE7UUFDakQsS0FBSyxNQUFNLEtBQUssSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pDLElBQUksYUFBYSxLQUFLLEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDNUMsYUFBYSxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUE7Z0JBRXBDLGlFQUFpRTtnQkFDakUsNERBQTREO2dCQUM1RCxJQUFJLGNBQXNCLENBQUE7Z0JBQzFCLElBQUksbUJBQW1CLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7b0JBQzVDLGNBQWMsR0FBRyxHQUFHLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTSxhQUFhLEVBQUUsQ0FBQTtnQkFDaEYsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGNBQWMsR0FBRyxhQUFhLENBQUE7Z0JBQy9CLENBQUM7Z0JBRUQsaUNBQWlDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQTtZQUNyRixDQUFDO1lBRUQsaUNBQWlDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFFRCxPQUFPLGlDQUFpQyxDQUFBO0lBQ3pDLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsTUFBTSxXQUFXLEdBQThCLEVBQUUsQ0FBQTtRQUVqRCxNQUFNLDhCQUE4QixHQUFHLENBQ3RDLGFBQXNDLEVBQ3RDLGFBQTRCLEVBQ0wsRUFBRTtZQUN6QixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQTtZQUMxRixNQUFNLE1BQU0sR0FBeUIsRUFBRSxDQUFBO1lBQ3ZDLEtBQUssTUFBTSxJQUFJLElBQUksa0JBQWtCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQkFDMUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzNELE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ1gsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSzt3QkFDdEIsY0FBYyxFQUFFLGtCQUFrQixDQUFDLEtBQUs7d0JBQ3hDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQztxQkFDdkQsQ0FBQyxDQUFBO2dCQUNILENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLENBQUE7UUFFRCxNQUFNLGlCQUFpQixHQUFHLENBQUMsUUFBK0IsRUFBRSxjQUFzQixFQUFFLEVBQUU7WUFDckYsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzVFLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRTlGLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzVCLElBQUksTUFBTSxHQUFHLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFDbkUsSUFBSSxNQUFNLEdBQUcsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUVuRSxJQUFJLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDaEIsTUFBTSxHQUFHLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsdUJBQXVCLENBQUMsTUFBTSxDQUFBO2dCQUNwRSxDQUFDO2dCQUVELElBQUksTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNoQixNQUFNLEdBQUcsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxNQUFNLENBQUE7Z0JBQ3BFLENBQUM7Z0JBRUQsT0FBTyxNQUFNLEdBQUcsTUFBTSxDQUFBO1lBQ3ZCLENBQUMsQ0FBQyxDQUFBO1lBRUYsS0FBSyxNQUFNLGFBQWEsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDdkYsSUFBSSxhQUFhLEVBQUUsQ0FBQzt3QkFDbkIsV0FBVyxDQUFDLElBQUksQ0FBQzs0QkFDaEIsS0FBSyxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLOzRCQUM1RSxjQUFjOzRCQUNkLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FDWixJQUFJLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDO3lCQUM5RSxDQUFDLENBQUE7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELG9CQUFvQjtRQUNwQixpQkFBaUIsd0NBQWdDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUMvRSxpQkFBaUIsc0NBQThCLFFBQVEsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMzRSxpQkFBaUIsNkNBRWhCLFFBQVEsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FDL0MsQ0FBQTtRQUVELE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxRQUErQixFQUFFLEVBQUU7WUFDakUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQzVFLEtBQUssTUFBTSxhQUFhLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7Z0JBQ3ZGLElBQUksYUFBYSxFQUFFLENBQUM7b0JBQ25CLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyw4QkFBOEIsQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTtnQkFDbEYsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCx5QkFBeUI7UUFDekIscUJBQXFCLHVDQUErQixDQUFBO1FBQ3BELHFCQUFxQixxQ0FBNkIsQ0FBQTtRQUNsRCxxQkFBcUIsNENBQW9DLENBQUE7UUFFekQsWUFBWTtRQUNaLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxFQUFFO1lBQzlELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLEVBQUU7Z0JBQzNELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FDckIsZUFBZSxFQUNmLFVBQVUsRUFDVixHQUFHLFVBQVUsR0FBRyxDQUFDLElBQUksYUFBYSxHQUFHLENBQUMsRUFBRSxFQUN4QyxRQUFRLENBQUMsS0FBSyxDQUNkLENBQUE7Z0JBQ0QsV0FBVyxDQUFDLElBQUksQ0FBQztvQkFDaEIsS0FBSztvQkFDTCxjQUFjLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUM7b0JBQ2pELE1BQU0sRUFBRSxLQUFLLElBQUksRUFBRTt3QkFDbEIsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO3dCQUMvQyxJQUFJLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO29CQUNqRCxDQUFDO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFlBQVk7YUFDZixRQUFRLEVBQUU7YUFDVixXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDO2FBQ2xDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN2QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFBO1lBQzFCLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUs7Z0JBQ0wsY0FBYyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDO2dCQUMxRCxNQUFNLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2xCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7d0JBQ3RFLFFBQVEsRUFBRSxJQUFJO3FCQUNkLENBQUMsQ0FBQTtvQkFFRixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQzt3QkFDcEQsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUE7b0JBQ3JELENBQUM7Z0JBQ0YsQ0FBQzthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBRUgsa0JBQWtCO1FBQ2xCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUMzRCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2hDLFdBQVcsQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDcEIsY0FBYyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDO2dCQUM5QyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzthQUN4RCxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsT0FBTyxXQUFXLENBQUE7SUFDbkIsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFNBQWtDO1FBQzlELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkYsSUFBSSxhQUFhLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUNOLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxxQkFBcUI7aUJBQ25GLE1BQU0sR0FBRyxDQUFDLENBQ1osQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7O0FBbk5XLHVCQUF1QjtJQUlqQyxXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHlCQUF5QixDQUFBO0lBQ3pCLFdBQUEsa0JBQWtCLENBQUE7R0FYUix1QkFBdUIsQ0FvTm5DOztBQUVELGlCQUFpQjtBQUVqQixNQUFNLE9BQU8sb0JBQXFCLFNBQVEsT0FBTzthQUNoQyxPQUFFLEdBQUcsMkJBQTJCLENBQUE7SUFFaEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0JBQW9CLENBQUMsRUFBRTtZQUMzQixLQUFLLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUM7WUFDekMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxJQUFJO1NBQ1IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEYsQ0FBQzs7QUFHRixNQUFNLE9BQU8sMkJBQTRCLFNBQVEsT0FBTzthQUN2QyxPQUFFLEdBQUcsZ0NBQWdDLENBQUE7YUFDckMsZUFBVSxHQUFHO1FBQzVCLE9BQU8sRUFBRSxpREFBNkI7UUFDdEMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGdEQUE2QixFQUFFO1FBQy9DLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7S0FDckIsQ0FBQTtJQUVEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDJCQUEyQixDQUFDLEVBQUU7WUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUM7WUFDcEQsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3pCLEVBQUUsRUFBRSxLQUFLLEVBQUUsdUdBQXVHO1lBQ2xILFVBQVUsRUFBRTtnQkFDWCxNQUFNLDZDQUFtQztnQkFDekMsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsR0FBRywyQkFBMkIsQ0FBQyxVQUFVO2FBQ3pDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsMkJBQTJCLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFaEYsaUJBQWlCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLEVBQUU7WUFDbEUsMEJBQTBCLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFO1lBQ2pELGNBQWMsRUFBRSxjQUFjLENBQUMsS0FBSztTQUNwQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQUdGLFlBQVkifQ==