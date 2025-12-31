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
import { timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalGroup } from './terminalGroup.js';
import { getInstanceFromResource } from './terminalUri.js';
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { asArray } from '../../../../base/common/arrays.js';
let TerminalGroupService = class TerminalGroupService extends Disposable {
    get instances() {
        return this.groups.reduce((p, c) => p.concat(c.terminalInstances), []);
    }
    constructor(_contextKeyService, _instantiationService, _viewsService, _viewDescriptorService, _quickInputService) {
        super();
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._viewsService = _viewsService;
        this._viewDescriptorService = _viewDescriptorService;
        this._quickInputService = _quickInputService;
        this.groups = [];
        this.activeGroupIndex = -1;
        this.lastAccessedMenu = 'inline-tab';
        this._isQuickInputOpened = false;
        this._onDidChangeActiveGroup = this._register(new Emitter());
        this.onDidChangeActiveGroup = this._onDidChangeActiveGroup.event;
        this._onDidDisposeGroup = this._register(new Emitter());
        this.onDidDisposeGroup = this._onDidDisposeGroup.event;
        this._onDidChangeGroups = this._register(new Emitter());
        this.onDidChangeGroups = this._onDidChangeGroups.event;
        this._onDidShow = this._register(new Emitter());
        this.onDidShow = this._onDidShow.event;
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onDidChangeInstances = this._register(new Emitter());
        this.onDidChangeInstances = this._onDidChangeInstances.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDidChangePanelOrientation = this._register(new Emitter());
        this.onDidChangePanelOrientation = this._onDidChangePanelOrientation.event;
        this._getValidTerminalGroups = (sources) => {
            return new Set(sources
                .map((source) => this.getGroupForInstance(source))
                .filter((group) => group !== undefined));
        };
        this._terminalGroupCountContextKey = TerminalContextKeys.groupCount.bindTo(this._contextKeyService);
        this._register(this.onDidDisposeGroup((group) => this._removeGroup(group)));
        this._register(this.onDidChangeGroups(() => this._terminalGroupCountContextKey.set(this.groups.length)));
        this._register(Event.any(this.onDidChangeActiveGroup, this.onDidChangeInstances)(() => this.updateVisibility()));
        this._register(this._quickInputService.onShow(() => (this._isQuickInputOpened = true)));
        this._register(this._quickInputService.onHide(() => (this._isQuickInputOpened = false)));
    }
    hidePanel() {
        // Hide the panel if the terminal is in the panel and it has no sibling views
        const panel = this._viewDescriptorService.getViewContainerByViewId(TERMINAL_VIEW_ID);
        if (panel &&
            this._viewDescriptorService.getViewContainerModel(panel).visibleViewDescriptors.length === 1) {
            this._viewsService.closeView(TERMINAL_VIEW_ID);
            TerminalContextKeys.tabsMouse.bindTo(this._contextKeyService).set(false);
        }
    }
    get activeGroup() {
        if (this.activeGroupIndex < 0 || this.activeGroupIndex >= this.groups.length) {
            return undefined;
        }
        return this.groups[this.activeGroupIndex];
    }
    set activeGroup(value) {
        if (value === undefined) {
            // Setting to undefined is not possible, this can only be done when removing the last group
            return;
        }
        const index = this.groups.findIndex((e) => e === value);
        this.setActiveGroupByIndex(index);
    }
    get activeInstance() {
        return this.activeGroup?.activeInstance;
    }
    setActiveInstance(instance) {
        this.setActiveInstanceByIndex(this._getIndexFromId(instance.instanceId));
    }
    _getIndexFromId(terminalId) {
        const terminalIndex = this.instances.findIndex((e) => e.instanceId === terminalId);
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    setContainer(container) {
        this._container = container;
        this.groups.forEach((group) => group.attachToElement(container));
    }
    async focusTabs() {
        if (this.instances.length === 0) {
            return;
        }
        await this.showPanel(true);
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        pane?.terminalTabbedView?.focusTabs();
    }
    async focusHover() {
        if (this.instances.length === 0) {
            return;
        }
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID);
        pane?.terminalTabbedView?.focusHover();
    }
    async focusInstance(_) {
        return this.showPanel(true);
    }
    async focusActiveInstance() {
        return this.showPanel(true);
    }
    createGroup(slcOrInstance) {
        const group = this._instantiationService.createInstance(TerminalGroup, this._container, slcOrInstance);
        this.groups.push(group);
        group.addDisposable(Event.forward(group.onPanelOrientationChanged, this._onDidChangePanelOrientation));
        group.addDisposable(Event.forward(group.onDidDisposeInstance, this._onDidDisposeInstance));
        group.addDisposable(Event.forward(group.onDidFocusInstance, this._onDidFocusInstance));
        group.addDisposable(Event.forward(group.onDidChangeInstanceCapability, this._onDidChangeInstanceCapability));
        group.addDisposable(Event.forward(group.onInstancesChanged, this._onDidChangeInstances));
        group.addDisposable(Event.forward(group.onDisposed, this._onDidDisposeGroup));
        group.addDisposable(group.onDidChangeActiveInstance((e) => {
            if (group === this.activeGroup) {
                this._onDidChangeActiveInstance.fire(e);
            }
        }));
        if (group.terminalInstances.length > 0) {
            this._onDidChangeInstances.fire();
        }
        if (this.instances.length === 1) {
            // It's the first instance so it should be made active automatically, this must fire
            // after onInstancesChanged so consumers can react to the instance being added first
            this.setActiveInstanceByIndex(0);
        }
        this._onDidChangeGroups.fire();
        return group;
    }
    async showPanel(focus) {
        const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) ??
            (await this._viewsService.openView(TERMINAL_VIEW_ID, focus));
        pane?.setExpanded(true);
        if (focus) {
            // Do the focus call asynchronously as going through the
            // command palette will force editor focus
            await timeout(0);
            const instance = this.activeInstance;
            if (instance) {
                // HACK: Ensure the panel is still visible at this point as there may have been
                // a request since it was opened to show a different panel
                if (pane && !pane.isVisible()) {
                    await this._viewsService.openView(TERMINAL_VIEW_ID, focus);
                }
                await instance.focusWhenReady(true);
            }
        }
        this._onDidShow.fire();
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    _removeGroup(group) {
        // Get the index of the group and remove it from the list
        const activeGroup = this.activeGroup;
        const wasActiveGroup = group === activeGroup;
        const index = this.groups.indexOf(group);
        if (index !== -1) {
            this.groups.splice(index, 1);
            this._onDidChangeGroups.fire();
        }
        if (wasActiveGroup) {
            // Adjust focus if the group was active
            if (this.groups.length > 0 && !this._isQuickInputOpened) {
                const newIndex = index < this.groups.length ? index : this.groups.length - 1;
                this.setActiveGroupByIndex(newIndex, true);
                this.activeInstance?.focus(true);
            }
        }
        else {
            // Adjust the active group if the removed group was above the active group
            if (this.activeGroupIndex > index) {
                this.setActiveGroupByIndex(this.activeGroupIndex - 1);
            }
        }
        // Ensure the active group is still valid, this should set the activeGroupIndex to -1 if
        // there are no groups
        if (this.activeGroupIndex >= this.groups.length) {
            this.setActiveGroupByIndex(this.groups.length - 1);
        }
        this._onDidChangeInstances.fire();
        this._onDidChangeGroups.fire();
        if (wasActiveGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    /**
     * @param force Whether to force the group change, this should be used when the previous active
     * group has been removed.
     */
    setActiveGroupByIndex(index, force) {
        // Unset active group when the last group is removed
        if (index === -1 && this.groups.length === 0) {
            if (this.activeGroupIndex !== -1) {
                this.activeGroupIndex = -1;
                this._onDidChangeActiveGroup.fire(this.activeGroup);
                this._onDidChangeActiveInstance.fire(this.activeInstance);
            }
            return;
        }
        // Ensure index is valid
        if (index < 0 || index >= this.groups.length) {
            return;
        }
        // Fire group/instance change if needed
        const oldActiveGroup = this.activeGroup;
        this.activeGroupIndex = index;
        if (force || oldActiveGroup !== this.activeGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    _getInstanceLocation(index) {
        let currentGroupIndex = 0;
        while (index >= 0 && currentGroupIndex < this.groups.length) {
            const group = this.groups[currentGroupIndex];
            const count = group.terminalInstances.length;
            if (index < count) {
                return {
                    group,
                    groupIndex: currentGroupIndex,
                    instance: group.terminalInstances[index],
                    instanceIndex: index,
                };
            }
            index -= count;
            currentGroupIndex++;
        }
        return undefined;
    }
    setActiveInstanceByIndex(index) {
        const activeInstance = this.activeInstance;
        const instanceLocation = this._getInstanceLocation(index);
        const newActiveInstance = instanceLocation?.group.terminalInstances[instanceLocation.instanceIndex];
        if (!instanceLocation || activeInstance === newActiveInstance) {
            return;
        }
        const activeInstanceIndex = instanceLocation.instanceIndex;
        this.activeGroupIndex = instanceLocation.groupIndex;
        this._onDidChangeActiveGroup.fire(this.activeGroup);
        instanceLocation.group.setActiveInstanceByIndex(activeInstanceIndex, true);
    }
    setActiveGroupToNext() {
        if (this.groups.length <= 1) {
            return;
        }
        let newIndex = this.activeGroupIndex + 1;
        if (newIndex >= this.groups.length) {
            newIndex = 0;
        }
        this.setActiveGroupByIndex(newIndex);
    }
    setActiveGroupToPrevious() {
        if (this.groups.length <= 1) {
            return;
        }
        let newIndex = this.activeGroupIndex - 1;
        if (newIndex < 0) {
            newIndex = this.groups.length - 1;
        }
        this.setActiveGroupByIndex(newIndex);
    }
    moveGroup(source, target) {
        source = asArray(source);
        const sourceGroups = this._getValidTerminalGroups(source);
        const targetGroup = this.getGroupForInstance(target);
        if (!targetGroup || sourceGroups.size === 0) {
            return;
        }
        // The groups are the same, rearrange within the group
        if (sourceGroups.size === 1 && sourceGroups.has(targetGroup)) {
            const targetIndex = targetGroup.terminalInstances.indexOf(target);
            const sortedSources = source.sort((a, b) => {
                return targetGroup.terminalInstances.indexOf(a) - targetGroup.terminalInstances.indexOf(b);
            });
            const firstTargetIndex = targetGroup.terminalInstances.indexOf(sortedSources[0]);
            const position = firstTargetIndex < targetIndex ? 'after' : 'before';
            targetGroup.moveInstance(sortedSources, targetIndex, position);
            this._onDidChangeInstances.fire();
            return;
        }
        // The groups differ, rearrange groups
        const targetGroupIndex = this.groups.indexOf(targetGroup);
        const sortedSourceGroups = Array.from(sourceGroups).sort((a, b) => {
            return this.groups.indexOf(a) - this.groups.indexOf(b);
        });
        const firstSourceGroupIndex = this.groups.indexOf(sortedSourceGroups[0]);
        const position = firstSourceGroupIndex < targetGroupIndex ? 'after' : 'before';
        const insertIndex = position === 'after' ? targetGroupIndex + 1 : targetGroupIndex;
        this.groups.splice(insertIndex, 0, ...sortedSourceGroups);
        for (const sourceGroup of sortedSourceGroups) {
            const originSourceGroupIndex = position === 'after'
                ? this.groups.indexOf(sourceGroup)
                : this.groups.lastIndexOf(sourceGroup);
            this.groups.splice(originSourceGroupIndex, 1);
        }
        this._onDidChangeInstances.fire();
    }
    moveGroupToEnd(source) {
        source = asArray(source);
        const sourceGroups = this._getValidTerminalGroups(source);
        if (sourceGroups.size === 0) {
            return;
        }
        const lastInstanceIndex = this.groups.length - 1;
        const sortedSourceGroups = Array.from(sourceGroups).sort((a, b) => {
            return this.groups.indexOf(a) - this.groups.indexOf(b);
        });
        this.groups.splice(lastInstanceIndex + 1, 0, ...sortedSourceGroups);
        for (const sourceGroup of sortedSourceGroups) {
            const sourceGroupIndex = this.groups.indexOf(sourceGroup);
            this.groups.splice(sourceGroupIndex, 1);
        }
        this._onDidChangeInstances.fire();
    }
    moveInstance(source, target, side) {
        const sourceGroup = this.getGroupForInstance(source);
        const targetGroup = this.getGroupForInstance(target);
        if (!sourceGroup || !targetGroup) {
            return;
        }
        // Move from the source group to the target group
        if (sourceGroup !== targetGroup) {
            // Move groups
            sourceGroup.removeInstance(source);
            targetGroup.addInstance(source);
        }
        // Rearrange within the target group
        const index = targetGroup.terminalInstances.indexOf(target) + (side === 'after' ? 1 : 0);
        targetGroup.moveInstance(source, index, side);
    }
    unsplitInstance(instance) {
        const oldGroup = this.getGroupForInstance(instance);
        if (!oldGroup || oldGroup.terminalInstances.length < 2) {
            return;
        }
        oldGroup.removeInstance(instance);
        this.createGroup(instance);
    }
    joinInstances(instances) {
        const group = this.getGroupForInstance(instances[0]);
        if (group) {
            let differentGroups = true;
            for (let i = 1; i < group.terminalInstances.length; i++) {
                if (group.terminalInstances.includes(instances[i])) {
                    differentGroups = false;
                    break;
                }
            }
            if (!differentGroups && group.terminalInstances.length === instances.length) {
                return;
            }
        }
        // Find the group of the first instance that is the only instance in the group, if one exists
        let candidateInstance = undefined;
        let candidateGroup = undefined;
        for (const instance of instances) {
            const group = this.getGroupForInstance(instance);
            if (group?.terminalInstances.length === 1) {
                candidateInstance = instance;
                candidateGroup = group;
                break;
            }
        }
        // Create a new group if needed
        if (!candidateGroup) {
            candidateGroup = this.createGroup();
        }
        const wasActiveGroup = this.activeGroup === candidateGroup;
        // Unsplit all other instances and add them to the new group
        for (const instance of instances) {
            if (instance === candidateInstance) {
                continue;
            }
            const oldGroup = this.getGroupForInstance(instance);
            if (!oldGroup) {
                // Something went wrong, don't join this one
                continue;
            }
            oldGroup.removeInstance(instance);
            candidateGroup.addInstance(instance);
        }
        // Set the active terminal
        this.setActiveInstance(instances[0]);
        // Fire events
        this._onDidChangeInstances.fire();
        if (!wasActiveGroup) {
            this._onDidChangeActiveGroup.fire(this.activeGroup);
        }
    }
    instanceIsSplit(instance) {
        const group = this.getGroupForInstance(instance);
        if (!group) {
            return false;
        }
        return group.terminalInstances.length > 1;
    }
    getGroupForInstance(instance) {
        return this.groups.find((group) => group.terminalInstances.includes(instance));
    }
    getGroupLabels() {
        return this.groups
            .filter((group) => group.terminalInstances.length > 0)
            .map((group, index) => {
            return `${index + 1}: ${group.title ? group.title : ''}`;
        });
    }
    /**
     * Visibility should be updated in the following cases:
     * 1. Toggle `TERMINAL_VIEW_ID` visibility
     * 2. Change active group
     * 3. Change instances in active group
     */
    updateVisibility() {
        const visible = this._viewsService.isViewVisible(TERMINAL_VIEW_ID);
        this.groups.forEach((g, i) => g.setVisible(visible && i === this.activeGroupIndex));
    }
};
TerminalGroupService = __decorate([
    __param(0, IContextKeyService),
    __param(1, IInstantiationService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, IQuickInputService)
], TerminalGroupService);
export { TerminalGroupService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHcm91cFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsR3JvdXBTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFcEQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBS25ELElBQUksU0FBUztRQUNaLE9BQU8sSUFBSSxDQUFDLE1BQU0s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