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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9jb21wb3NpdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUEwQixZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFHbEQsT0FBTyxFQUFTLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBTTNELE9BQU8sRUFBRSxVQUFVLEVBQTJCLE1BQU0sMkJBQTJCLENBQUE7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQU01RDs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sT0FBZ0IsU0FBVSxTQUFRLFNBQVM7SUFLaEQsSUFBSSxVQUFVO1FBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLFVBQVUsQ0FBQTtRQUM5RCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQTtJQUM5QixDQUFDO0lBR0QsSUFBSSxTQUFTO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLFNBQVMsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQTtJQUM3QixDQUFDO0lBR0QsUUFBUTtRQUNQLE9BQU8sSUFB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