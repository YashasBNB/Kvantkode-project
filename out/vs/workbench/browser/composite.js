/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ActionRunner } from '../../base/common/actions.js';
import { Component } from '../common/component.js';
import { Emitter } from '../../base/common/event.js';
import { trackFocus } from '../../base/browser/dom.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { assertIsDefined } from '../../base/common/types.js';
/**
 * Composites are layed out in the sidebar and panel part of the workbench. At a time only one composite
 * can be open in the sidebar, and only one composite can be open in the panel.
 *
 * Each composite has a minimized representation that is good enough to provide some
 * information about the state of the composite data.
 *
 * The workbench will keep a composite alive after it has been created and show/hide it based on
 * user interaction. The lifecycle of a composite goes in the order create(), setVisible(true|false),
 * layout(), focus(), dispose(). During use of the workbench, a composite will often receive a setVisible,
 * layout and focus call, but only one create and dispose call.
 */
export class Composite extends Component {
    get onDidFocus() {
        if (!this._onDidFocus) {
            this._onDidFocus = this.registerFocusTrackEvents().onDidFocus;
        }
        return this._onDidFocus.event;
    }
    get onDidBlur() {
        if (!this._onDidBlur) {
            this._onDidBlur = this.registerFocusTrackEvents().onDidBlur;
        }
        return this._onDidBlur.event;
    }
    hasFocus() {
        return this._hasFocus;
    }
    registerFocusTrackEvents() {
        const container = assertIsDefined(this.getContainer());
        const focusTracker = this._register(trackFocus(container));
        const onDidFocus = (this._onDidFocus = this._register(new Emitter()));
        this._register(focusTracker.onDidFocus(() => {
            this._hasFocus = true;
            onDidFocus.fire();
        }));
        const onDidBlur = (this._onDidBlur = this._register(new Emitter()));
        this._register(focusTracker.onDidBlur(() => {
            this._hasFocus = false;
            onDidBlur.fire();
        }));
        return { onDidFocus, onDidBlur };
    }
    constructor(id, telemetryService, themeService, storageService) {
        super(id, themeService, storageService);
        this.telemetryService = telemetryService;
        this._onTitleAreaUpdate = this._register(new Emitter());
        this.onTitleAreaUpdate = this._onTitleAreaUpdate.event;
        this._hasFocus = false;
        this.visible = false;
    }
    getTitle() {
        return undefined;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to create this composite on the provided parent. This method is only
     * called once during the lifetime of the workbench.
     * Note that DOM-dependent calculations should be performed from the setVisible()
     * call. Only then the composite will be part of the DOM.
     */
    create(parent) {
        this.parent = parent;
    }
    /**
     * Returns the container this composite is being build in.
     */
    getContainer() {
        return this.parent;
    }
    /**
     * Note: Clients should not call this method, the workbench calls this
     * method. Calling it otherwise may result in unexpected behavior.
     *
     * Called to indicate that the composite has become visible or hidden. This method
     * is called more than once during workbench lifecycle depending on the user interaction.
     * The composite will be on-DOM if visible is set to true and off-DOM otherwise.
     *
     * Typically this operation should be fast though because setVisible might be called many times during a session.
     * If there is a long running operation it is fine to have it running in the background asyncly and return before.
     */
    setVisible(visible) {
        if (this.visible !== !!visible) {
            this.visible = visible;
        }
    }
    /**
     * Called when this composite should receive keyboard focus.
     */
    focus() {
        // Subclasses can implement
    }
    /**
     *
     * @returns the action runner for this composite
     */
    getMenuIds() {
        return [];
    }
    /**
     * Returns an array of actions to show in the action bar of the composite.
     */
    getActions() {
        return [];
    }
    /**
     * Returns an array of actions to show in the action bar of the composite
     * in a less prominent way then action from getActions.
     */
    getSecondaryActions() {
        return [];
    }
    /**
     * Returns an array of actions to show in the context menu of the composite
     */
    getContextMenuActions() {
        return [];
    }
    /**
     * For any of the actions returned by this composite, provide an IActionViewItem in
     * cases where the implementor of the composite wants to override the presentation
     * of an action. Returns undefined to indicate that the action is not rendered through
     * an action item.
     */
    getActionViewItem(action, options) {
        return undefined;
    }
    /**
     * Provide a context to be passed to the toolbar.
     */
    getActionsContext() {
        return null;
    }
    /**
     * Returns the instance of IActionRunner to use with this composite for the
     * composite tool bar.
     */
    getActionRunner() {
        if (!this.actionRunner) {
            this.actionRunner = this._register(new ActionRunner());
        }
        return this.actionRunner;
    }
    /**
     * Method for composite implementors to indicate to the composite container that the title or the actions
     * of the composite have changed. Calling this method will cause the container to ask for title (getTitle())
     * and actions (getActions(), getSecondaryActions()) if the composite is visible or the next time the composite
     * gets visible.
     */
    updateTitleArea() {
        this._onTitleAreaUpdate.fire();
    }
    /**
     * Returns true if this composite is currently visible and false otherwise.
     */
    isVisible() {
        return this.visible;
    }
    /**
     * Returns the underlying composite control or `undefined` if it is not accessible.
     */
    getControl() {
        return undefined;
    }
}
/**
 * A composite descriptor is a lightweight descriptor of a composite in the workbench.
 */
export class CompositeDescriptor {
    constructor(ctor, id, name, cssClass, order, requestedIndex) {
        this.ctor = ctor;
        this.id = id;
        this.name = name;
        this.cssClass = cssClass;
        this.order = order;
        this.requestedIndex = requestedIndex;
    }
    instantiate(instantiationService) {
        return instantiationService.createInstance(this.ctor);
    }
}
export class CompositeRegistry extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidRegister = this._register(new Emitter());
        this.onDidRegister = this._onDidRegister.event;
        this._onDidDeregister = this._register(new Emitter());
        this.onDidDeregister = this._onDidDeregister.event;
        this.composites = [];
    }
    registerComposite(descriptor) {
        if (this.compositeById(descriptor.id)) {
            return;
        }
        this.composites.push(descriptor);
        this._onDidRegister.fire(descriptor);
    }
    deregisterComposite(id) {
        const descriptor = this.compositeById(id);
        if (!descriptor) {
            return;
        }
        this.composites.splice(this.composites.indexOf(descriptor), 1);
        this._onDidDeregister.fire(descriptor);
    }
    getComposite(id) {
        return this.compositeById(id);
    }
    getComposites() {
        return this.composites.slice(0);
    }
    compositeById(id) {
        return this.composites.find((composite) => composite.id === id);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvY29tcG9zaXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBMEIsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBR2xELE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQU0zRCxPQUFPLEVBQUUsVUFBVSxFQUEyQixNQUFNLDJCQUEyQixDQUFBO0FBRS9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFNNUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLE9BQWdCLFNBQVUsU0FBUSxTQUFTO0lBS2hELElBQUksVUFBVTtRQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxVQUFVLENBQUE7UUFDOUQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUE7SUFDOUIsQ0FBQztJQUdELElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxTQUFTLENBQUE7UUFDNUQsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUE7SUFDN0IsQ0FBQztJQUdELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUE7SUFDdEIs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