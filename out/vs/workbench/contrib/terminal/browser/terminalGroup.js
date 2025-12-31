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
import { TERMINAL_VIEW_ID } from '../common/terminal.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { SplitView, Sizing, } from '../../../../base/browser/ui/splitview/splitview.js';
import { isHorizontal, IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITerminalInstanceService, ITerminalConfigurationService, } from './terminal.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { getWindow } from '../../../../base/browser/dom.js';
import { getPartByLocation } from '../../../services/views/browser/viewsService.js';
import { asArray } from '../../../../base/common/arrays.js';
var Constants;
(function (Constants) {
    /**
     * The minimum size in pixels of a split pane.
     */
    Constants[Constants["SplitPaneMinSize"] = 80] = "SplitPaneMinSize";
    /**
     * The number of cells the terminal gets added or removed when asked to increase or decrease
     * the view size.
     */
    Constants[Constants["ResizePartCellCount"] = 4] = "ResizePartCellCount";
})(Constants || (Constants = {}));
class SplitPaneContainer extends Disposable {
    get onDidChange() {
        return this._onDidChange;
    }
    constructor(_container, orientation) {
        super();
        this._container = _container;
        this.orientation = orientation;
        this._splitViewDisposables = this._register(new DisposableStore());
        this._children = [];
        this._terminalToPane = new Map();
        this._onDidChange = Event.None;
        this._width = this._container.offsetWidth;
        this._height = this._container.offsetHeight;
        this._createSplitView();
        this._splitView.layout(this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._width : this._height);
    }
    _createSplitView() {
        this._splitViewDisposables.clear();
        this._splitView = new SplitView(this._container, { orientation: this.orientation });
        this._splitViewDisposables.add(this._splitView);
        this._splitViewDisposables.add(this._splitView.onDidSashReset(() => this._splitView.distributeViewSizes()));
    }
    split(instance, index) {
        this._addChild(instance, index);
    }
    resizePane(index, direction, amount) {
        // Only resize when there is more than one pane
        if (this._children.length <= 1) {
            return;
        }
        // Get sizes
        const sizes = [];
        for (let i = 0; i < this._splitView.length; i++) {
            sizes.push(this._splitView.getViewSize(i));
        }
        // Remove size from right pane, unless index is the last pane in which case use left pane
        const isSizingEndPane = index !== this._children.length - 1;
        const indexToChange = isSizingEndPane ? index + 1 : index - 1;
        if (isSizingEndPane && direction === 0 /* Direction.Left */) {
            amount *= -1;
        }
        else if (!isSizingEndPane && direction === 1 /* Direction.Right */) {
            amount *= -1;
        }
        else if (isSizingEndPane && direction === 2 /* Direction.Up */) {
            amount *= -1;
        }
        else if (!isSizingEndPane && direction === 3 /* Direction.Down */) {
            amount *= -1;
        }
        // Ensure the size is not reduced beyond the minimum, otherwise weird things can happen
        if (sizes[index] + amount < 80 /* Constants.SplitPaneMinSize */) {
            amount = 80 /* Constants.SplitPaneMinSize */ - sizes[index];
        }
        else if (sizes[indexToChange] - amount < 80 /* Constants.SplitPaneMinSize */) {
            amount = sizes[indexToChange] - 80 /* Constants.SplitPaneMinSize */;
        }
        // Apply the size change
        sizes[index] += amount;
        sizes[indexToChange] -= amount;
        for (let i = 0; i < this._splitView.length - 1; i++) {
            this._splitView.resizeView(i, sizes[i]);
        }
    }
    resizePanes(relativeSizes) {
        if (this._children.length <= 1) {
            return;
        }
        // assign any extra size to last terminal
        relativeSizes[relativeSizes.length - 1] +=
            1 - relativeSizes.reduce((totalValue, currentValue) => totalValue + currentValue, 0);
        let totalSize = 0;
        for (let i = 0; i < this._splitView.length; i++) {
            totalSize += this._splitView.getViewSize(i);
        }
        for (let i = 0; i < this._splitView.length; i++) {
            this._splitView.resizeView(i, totalSize * relativeSizes[i]);
        }
    }
    getPaneSize(instance) {
        const paneForInstance = this._terminalToPane.get(instance);
        if (!paneForInstance) {
            return 0;
        }
        const index = this._children.indexOf(paneForInstance);
        return this._splitView.getViewSize(index);
    }
    _addChild(instance, index) {
        const child = new SplitPane(instance, this.orientation === 1 /* Orientation.HORIZONTAL */ ? this._height : this._width);
        child.orientation = this.orientation;
        if (typeof index === 'number') {
            this._children.splice(index, 0, child);
        }
        else {
            this._children.push(child);
        }
        this._terminalToPane.set(instance, this._children[this._children.indexOf(child)]);
        this._withDisabledLayout(() => this._splitView.addView(child, Sizing.Distribute, index));
        this.layout(this._width, this._height);
        this._onDidChange = Event.any(...this._children.map((c) => c.onDidChange));
    }
    remove(instance) {
        let index = null;
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].instance === instance) {
                index = i;
            }
        }
        if (index !== null) {
            this._children.splice(index, 1);
            this._terminalToPane.delete(instance);
            this._splitView.removeView(index, Sizing.Distribute);
            instance.detachFromElement();
        }
    }
    layout(width, height) {
        this._width = width;
        this._height = height;
        if (this.orientation === 1 /* Orientation.HORIZONTAL */) {
            this._children.forEach((c) => c.orthogonalLayout(height));
            this._splitView.layout(width);
        }
        else {
            this._children.forEach((c) => c.orthogonalLayout(width));
            this._splitView.layout(height);
        }
    }
    setOrientation(orientation) {
        if (this.orientation === orientation) {
            return;
        }
        this.orientation = orientation;
        // Remove old split view
        while (this._container.children.length > 0) {
            this._container.children[0].remove();
        }
        // Create new split view with updated orientation
        this._createSplitView();
        this._withDisabledLayout(() => {
            this._children.forEach((child) => {
                child.orientation = orientation;
                this._splitView.addView(child, 1);
            });
        });
    }
    _withDisabledLayout(innerFunction) {
        // Whenever manipulating views that are going to be changed immediately, disabling
        // layout/resize events in the terminal prevent bad dimensions going to the pty.
        this._children.forEach((c) => (c.instance.disableLayout = true));
        innerFunction();
        this._children.forEach((c) => (c.instance.disableLayout = false));
    }
}
class SplitPane {
    get onDidChange() {
        return this._onDidChange;
    }
    constructor(instance, orthogonalSize) {
        this.instance = instance;
        this.orthogonalSize = orthogonalSize;
        this.minimumSize = 80 /* Constants.SplitPaneMinSize */;
        this.maximumSize = Number.MAX_VALUE;
        this._onDidChange = Event.None;
        this.element = document.createElement('div');
        this.element.className = 'terminal-split-pane';
        this.instance.attachToElement(this.element);
    }
    layout(size) {
        // Only layout when both sizes are known
        if (!size || !this.orthogonalSize) {
            return;
        }
        if (this.orientation === 0 /* Orientation.VERTICAL */) {
            this.instance.layout({ width: this.orthogonalSize, height: size });
        }
        else {
            this.instance.layout({ width: size, height: this.orthogonalSize });
        }
    }
    orthogonalLayout(size) {
        this.orthogonalSize = size;
    }
}
let TerminalGroup = class TerminalGroup extends Disposable {
    get terminalInstances() {
        return this._terminalInstances;
    }
    constructor(_container, shellLaunchConfigOrInstance, _terminalConfigurationService, _terminalInstanceService, _layoutService, _viewDescriptorService, _instantiationService) {
        super();
        this._container = _container;
        this._terminalConfigurationService = _terminalConfigurationService;
        this._terminalInstanceService = _terminalInstanceService;
        this._layoutService = _layoutService;
        this._viewDescriptorService = _viewDescriptorService;
        this._instantiationService = _instantiationService;
        this._terminalInstances = [];
        this._panelPosition = 2 /* Position.BOTTOM */;
        this._terminalLocation = 1 /* ViewContainerLocation.Panel */;
        this._instanceDisposables = new Map();
        this._activeInstanceIndex = -1;
        this._visible = false;
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDisposed = this._register(new Emitter());
        this.onDisposed = this._onDisposed.event;
        this._onInstancesChanged = this._register(new Emitter());
        this.onInstancesChanged = this._onInstancesChanged.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onPanelOrientationChanged = this._register(new Emitter());
        this.onPanelOrientationChanged = this._onPanelOrientationChanged.event;
        if (shellLaunchConfigOrInstance) {
            this.addInstance(shellLaunchConfigOrInstance);
        }
        if (this._container) {
            this.attachToElement(this._container);
        }
        this._onPanelOrientationChanged.fire(this._terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(this._panelPosition)
            ? 1 /* Orientation.HORIZONTAL */
            : 0 /* Orientation.VERTICAL */);
        this._register(toDisposable(() => {
            if (this._container && this._groupElement) {
                this._groupElement.remove();
                this._groupElement = undefined;
            }
        }));
    }
    addInstance(shellLaunchConfigOrInstance, parentTerminalId) {
        let instance;
        // if a parent terminal is provided, find it
        // otherwise, parent is the active terminal
        const parentIndex = parentTerminalId
            ? this._terminalInstances.findIndex((t) => t.instanceId === parentTerminalId)
            : this._activeInstanceIndex;
        if ('instanceId' in shellLaunchConfigOrInstance) {
            instance = shellLaunchConfigOrInstance;
        }
        else {
            instance = this._terminalInstanceService.createInstance(shellLaunchConfigOrInstance, TerminalLocation.Panel);
        }
        if (this._terminalInstances.length === 0) {
            this._terminalInstances.push(instance);
            this._activeInstanceIndex = 0;
        }
        else {
            this._terminalInstances.splice(parentIndex + 1, 0, instance);
        }
        this._initInstanceListeners(instance);
        if (this._splitPaneContainer) {
            this._splitPaneContainer.split(instance, parentIndex + 1);
        }
        this._onInstancesChanged.fire();
    }
    dispose() {
        this._terminalInstances = [];
        this._onInstancesChanged.fire();
        this._splitPaneContainer?.dispose();
        super.dispose();
    }
    get activeInstance() {
        if (this._terminalInstances.length === 0) {
            return undefined;
        }
        return this._terminalInstances[this._activeInstanceIndex];
    }
    getLayoutInfo(isActive) {
        const instances = this.terminalInstances.filter((instance) => typeof instance.persistentProcessId === 'number' && instance.shouldPersist);
        const totalSize = instances
            .map((t) => this._splitPaneContainer?.getPaneSize(t) || 0)
            .reduce((total, size) => (total += size), 0);
        return {
            isActive: isActive,
            activePersistentProcessId: this.activeInstance
                ? this.activeInstance.persistentProcessId
                : undefined,
            terminals: instances.map((t) => {
                return {
                    relativeSize: totalSize > 0 ? this._splitPaneContainer.getPaneSize(t) / totalSize : 0,
                    terminal: t.persistentProcessId || 0,
                };
            }),
        };
    }
    _initInstanceListeners(instance) {
        this._instanceDisposables.set(instance.instanceId, [
            instance.onDisposed((instance) => {
                this._onDidDisposeInstance.fire(instance);
                this._handleOnDidDisposeInstance(instance);
            }),
            instance.onDidFocus((instance) => {
                this._setActiveInstance(instance);
                this._onDidFocusInstance.fire(instance);
            }),
            instance.capabilities.onDidAddCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
            instance.capabilities.onDidRemoveCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
        ]);
    }
    _handleOnDidDisposeInstance(instance) {
        this._removeInstance(instance);
    }
    removeInstance(instance) {
        this._removeInstance(instance);
    }
    _removeInstance(instance) {
        const index = this._terminalInstances.indexOf(instance);
        if (index === -1) {
            return;
        }
        const wasActiveInstance = instance === this.activeInstance;
        this._terminalInstances.splice(index, 1);
        // Adjust focus if the instance was active
        if (wasActiveInstance && this._terminalInstances.length > 0) {
            const newIndex = index < this._terminalInstances.length ? index : this._terminalInstances.length - 1;
            this.setActiveInstanceByIndex(newIndex);
            // TODO: Only focus the new instance if the group had focus?
            this.activeInstance?.focus(true);
        }
        else if (index < this._activeInstanceIndex) {
            // Adjust active instance index if needed
            this._activeInstanceIndex--;
        }
        this._splitPaneContainer?.remove(instance);
        // Fire events and dispose group if it was the last instance
        if (this._terminalInstances.length === 0) {
            this._onDisposed.fire(this);
            this.dispose();
        }
        else {
            this._onInstancesChanged.fire();
        }
        // Dispose instance event listeners
        const disposables = this._instanceDisposables.get(instance.instanceId);
        if (disposables) {
            dispose(disposables);
            this._instanceDisposables.delete(instance.instanceId);
        }
    }
    moveInstance(instances, index, position) {
        instances = asArray(instances);
        const hasInvalidInstance = instances.some((instance) => !this.terminalInstances.includes(instance));
        if (hasInvalidInstance) {
            return;
        }
        const insertIndex = position === 'before' ? index : index + 1;
        this._terminalInstances.splice(insertIndex, 0, ...instances);
        for (const item of instances) {
            const originSourceGroupIndex = position === 'after'
                ? this._terminalInstances.indexOf(item)
                : this._terminalInstances.lastIndexOf(item);
            this._terminalInstances.splice(originSourceGroupIndex, 1);
        }
        if (this._splitPaneContainer) {
            for (let i = 0; i < instances.length; i++) {
                const item = instances[i];
                this._splitPaneContainer.remove(item);
                this._splitPaneContainer.split(item, index + (position === 'before' ? i : 0));
            }
        }
        this._onInstancesChanged.fire();
    }
    _setActiveInstance(instance) {
        this.setActiveInstanceByIndex(this._getIndexFromId(instance.instanceId));
    }
    _getIndexFromId(terminalId) {
        let terminalIndex = -1;
        this.terminalInstances.forEach((terminalInstance, i) => {
            if (terminalInstance.instanceId === terminalId) {
                terminalIndex = i;
            }
        });
        if (terminalIndex === -1) {
            throw new Error(`Terminal with ID ${terminalId} does not exist (has it already been disposed?)`);
        }
        return terminalIndex;
    }
    setActiveInstanceByIndex(index, force) {
        // Check for invalid value
        if (index < 0 || index >= this._terminalInstances.length) {
            return;
        }
        const oldActiveInstance = this.activeInstance;
        this._activeInstanceIndex = index;
        if (oldActiveInstance !== this.activeInstance || force) {
            this._onInstancesChanged.fire();
            this._onDidChangeActiveInstance.fire(this.activeInstance);
        }
    }
    attachToElement(element) {
        this._container = element;
        // If we already have a group element, we can reparent it
        if (!this._groupElement) {
            this._groupElement = document.createElement('div');
            this._groupElement.classList.add('terminal-group');
        }
        this._container.appendChild(this._groupElement);
        if (!this._splitPaneContainer) {
            this._panelPosition = this._layoutService.getPanelPosition();
            this._terminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
            const orientation = this._terminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(this._panelPosition)
                ? 1 /* Orientation.HORIZONTAL */
                : 0 /* Orientation.VERTICAL */;
            this._splitPaneContainer = this._instantiationService.createInstance(SplitPaneContainer, this._groupElement, orientation);
            this.terminalInstances.forEach((instance) => this._splitPaneContainer.split(instance, this._activeInstanceIndex + 1));
        }
    }
    get title() {
        if (this._terminalInstances.length === 0) {
            // Normally consumers should not call into title at all after the group is disposed but
            // this is required when the group is used as part of a tree.
            return '';
        }
        let title = this.terminalInstances[0].title + this._getBellTitle(this.terminalInstances[0]);
        if (this.terminalInstances[0].description) {
            title += ` (${this.terminalInstances[0].description})`;
        }
        for (let i = 1; i < this.terminalInstances.length; i++) {
            const instance = this.terminalInstances[i];
            if (instance.title) {
                title += `, ${instance.title + this._getBellTitle(instance)}`;
                if (instance.description) {
                    title += ` (${instance.description})`;
                }
            }
        }
        return title;
    }
    _getBellTitle(instance) {
        if (this._terminalConfigurationService.config.enableBell &&
            instance.statusList.statuses.some((e) => e.id === "bell" /* TerminalStatus.Bell */)) {
            return '*';
        }
        return '';
    }
    setVisible(visible) {
        this._visible = visible;
        if (this._groupElement) {
            this._groupElement.style.display = visible ? '' : 'none';
        }
        this.terminalInstances.forEach((i) => i.setVisible(visible));
    }
    split(shellLaunchConfig) {
        const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Panel);
        this.addInstance(instance, shellLaunchConfig.parentTerminalId);
        this._setActiveInstance(instance);
        return instance;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
    layout(width, height) {
        if (this._splitPaneContainer) {
            // Check if the panel position changed and rotate panes if so
            const newPanelPosition = this._layoutService.getPanelPosition();
            const newTerminalLocation = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
            const terminalPositionChanged = newPanelPosition !== this._panelPosition || newTerminalLocation !== this._terminalLocation;
            if (terminalPositionChanged) {
                const newOrientation = newTerminalLocation === 1 /* ViewContainerLocation.Panel */ && isHorizontal(newPanelPosition)
                    ? 1 /* Orientation.HORIZONTAL */
                    : 0 /* Orientation.VERTICAL */;
                this._splitPaneContainer.setOrientation(newOrientation);
                this._panelPosition = newPanelPosition;
                this._terminalLocation = newTerminalLocation;
                this._onPanelOrientationChanged.fire(this._splitPaneContainer.orientation);
            }
            this._splitPaneContainer.layout(width, height);
            if (this._initialRelativeSizes && this._visible) {
                this.resizePanes(this._initialRelativeSizes);
                this._initialRelativeSizes = undefined;
            }
        }
    }
    focusPreviousPane() {
        const newIndex = this._activeInstanceIndex === 0
            ? this._terminalInstances.length - 1
            : this._activeInstanceIndex - 1;
        this.setActiveInstanceByIndex(newIndex);
    }
    focusNextPane() {
        const newIndex = this._activeInstanceIndex === this._terminalInstances.length - 1
            ? 0
            : this._activeInstanceIndex + 1;
        this.setActiveInstanceByIndex(newIndex);
    }
    _getPosition() {
        switch (this._terminalLocation) {
            case 1 /* ViewContainerLocation.Panel */:
                return this._panelPosition;
            case 0 /* ViewContainerLocation.Sidebar */:
                return this._layoutService.getSideBarPosition();
            case 2 /* ViewContainerLocation.AuxiliaryBar */:
                return this._layoutService.getSideBarPosition() === 0 /* Position.LEFT */
                    ? 1 /* Position.RIGHT */
                    : 0 /* Position.LEFT */;
        }
    }
    _getOrientation() {
        return isHorizontal(this._getPosition()) ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */;
    }
    resizePane(direction) {
        if (!this._splitPaneContainer) {
            return;
        }
        const isHorizontalResize = direction === 0 /* Direction.Left */ || direction === 1 /* Direction.Right */;
        const groupOrientation = this._getOrientation();
        const shouldResizePart = (isHorizontalResize && groupOrientation === 0 /* Orientation.VERTICAL */) ||
            (!isHorizontalResize && groupOrientation === 1 /* Orientation.HORIZONTAL */);
        const font = this._terminalConfigurationService.getFont(getWindow(this._groupElement));
        // TODO: Support letter spacing and line height
        const charSize = isHorizontalResize ? font.charWidth : font.charHeight;
        if (charSize) {
            let resizeAmount = charSize * 4 /* Constants.ResizePartCellCount */;
            if (shouldResizePart) {
                const position = this._getPosition();
                const shouldShrink = (position === 0 /* Position.LEFT */ && direction === 0 /* Direction.Left */) ||
                    (position === 1 /* Position.RIGHT */ && direction === 1 /* Direction.Right */) ||
                    (position === 2 /* Position.BOTTOM */ && direction === 3 /* Direction.Down */) ||
                    (position === 3 /* Position.TOP */ && direction === 2 /* Direction.Up */);
                if (shouldShrink) {
                    resizeAmount *= -1;
                }
                this._layoutService.resizePart(getPartByLocation(this._terminalLocation), resizeAmount, resizeAmount);
            }
            else {
                this._splitPaneContainer.resizePane(this._activeInstanceIndex, direction, resizeAmount);
            }
        }
    }
    resizePanes(relativeSizes) {
        if (!this._splitPaneContainer) {
            this._initialRelativeSizes = relativeSizes;
            return;
        }
        this._splitPaneContainer.resizePanes(relativeSizes);
    }
};
TerminalGroup = __decorate([
    __param(2, ITerminalConfigurationService),
    __param(3, ITerminalInstanceService),
    __param(4, IWorkbenchLayoutService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService)
], TerminalGroup);
export { TerminalGroup };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHcm91cC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxHcm91cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sRUFDUCxZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sU0FBUyxFQUdULE1BQU0sR0FDTixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFDTixZQUFZLEVBQ1osdUJBQXVCLEdBRXZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUlOLHdCQUF3QixFQUN4Qiw2QkFBNkIsR0FDN0IsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUF5QixzQkFBc0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hGLE9BQU8sRUFHTixnQkFBZ0IsR0FDaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTNELElBQVcsU0FVVjtBQVZELFdBQVcsU0FBUztJQUNuQjs7T0FFRztJQUNILGtFQUFxQixDQUFBO0lBQ3JCOzs7T0FHRztJQUNILHVF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