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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxHcm91cC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEdyb3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUVOLFVBQVUsRUFDVixlQUFlLEVBQ2YsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixTQUFTLEVBR1QsTUFBTSxHQUNOLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUNOLFlBQVksRUFDWix1QkFBdUIsR0FFdkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBSU4sd0JBQXdCLEVBQ3hCLDZCQUE2QixHQUM3QixNQUFNLGVBQWUsQ0FBQTtBQUN0QixPQUFPLEVBQXlCLHNCQUFzQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEYsT0FBTyxFQUdOLGdCQUFnQixHQUNoQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFM0QsSUFBVyxTQVVWO0FBVkQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsa0VBQXFCLENBQUE7SUFDckI7OztPQUdHO0lB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