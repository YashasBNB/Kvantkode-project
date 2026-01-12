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
import { Emitter } from '../../../../../../base/common/event.js';
import { PromptAttachmentWidget } from './promptAttachmentWidget.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Widget for a collection of prompt instructions attachments.
 * See {@linkcode PromptAttachmentWidget}.
 */
let PromptAttachmentsCollectionWidget = class PromptAttachmentsCollectionWidget extends Disposable {
    /**
     * Subscribe to the `onAttachmentsCountChange` event.
     * @param callback Function to invoke when number of attachments change.
     */
    onAttachmentsCountChange(callback) {
        this._register(this._onAttachmentsCountChange.event(callback));
        return this;
    }
    /**
     * Get all `URI`s of all valid references, including all
     * the possible references nested inside the children.
     */
    get references() {
        return this.model.references;
    }
    /**
     * Get the list of all prompt instruction attachment variables, including all
     * nested child references of each attachment explicitly attached by user.
     */
    get chatAttachments() {
        return this.model.chatAttachments;
    }
    /**
     * Check if child widget list is empty (no attachments present).
     */
    get empty() {
        return this.children.length === 0;
    }
    constructor(model, resourceLabels, initService, logService) {
        super();
        this.model = model;
        this.resourceLabels = resourceLabels;
        this.initService = initService;
        this.logService = logService;
        /**
         * List of child instruction attachment widgets.
         */
        this.children = [];
        /**
         * Event that fires when number of attachments change
         *
         * See {@linkcode onAttachmentsCountChange}.
         */
        this._onAttachmentsCountChange = this._register(new Emitter());
        this.render = this.render.bind(this);
        // when a new attachment model is added, create a new child widget for it
        this.model.onAdd((attachment) => {
            const widget = this.initService.createInstance(PromptAttachmentWidget, attachment, this.resourceLabels);
            // handle the child widget disposal event, removing it from the list
            widget.onDispose(this.handleAttachmentDispose.bind(this, widget));
            // register the new child widget
            this.children.push(widget);
            // if parent node is present - append the wiget to it, otherwise wait
            // until the `render` method will be called
            if (this.parentNode) {
                this.parentNode.appendChild(widget.domNode);
            }
            // fire the event to notify about the change in the number of attachments
            this._onAttachmentsCountChange.fire();
        });
    }
    /**
     * Handle child widget disposal.
     * @param widget The child widget that was disposed.
     */
    handleAttachmentDispose(widget) {
        // common prefix for all log messages
        const logPrefix = `[onChildDispose] Widget for instructions attachment '${widget.uri.path}'`;
        // flag to check if the widget was found in the children list
        let widgetExists = false;
        // filter out disposed child widget from the list
        this.children = this.children.filter((child) => {
            if (child === widget) {
                // because we filter out all objects here it might be ok to have multiple of them, but
                // it also highlights a potential issue in our logic somewhere else, so trace a warning here
                if (widgetExists) {
                    this.logService.warn(`${logPrefix} is present in the children references list multiple times.`);
                }
                widgetExists = true;
                return false;
            }
            return true;
        });
        // no widget was found in the children list, while it might be ok it also
        // highlights a potential issue in our logic, so trace a warning here
        if (!widgetExists) {
            this.logService.warn(`${logPrefix} was disposed, but was not found in the child references.`);
        }
        if (!this.parentNode) {
            this.logService.warn(`${logPrefix} no parent node reference found.`);
        }
        // remove the child widget root node from the DOM
        this.parentNode?.removeChild(widget.domNode);
        // fire the event to notify about the change in the number of attachments
        this._onAttachmentsCountChange.fire();
        return this;
    }
    /**
     * Render attachments into the provided `parentNode`.
     *
     * Note! this method assumes that the provided `parentNode` is cleared by the caller.
     */
    render(parentNode) {
        this.parentNode = parentNode;
        for (const widget of this.children) {
            this.parentNode.appendChild(widget.domNode);
        }
        return this;
    }
    /**
     * Dispose of the widget, including all the child
     * widget instances.
     */
    dispose() {
        for (const child of this.children) {
            child.dispose();
        }
        super.dispose();
    }
};
PromptAttachmentsCollectionWidget = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], PromptAttachmentsCollectionWidget);
export { PromptAttachmentsCollectionWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0QXR0YWNobWVudHNDb2xsZWN0aW9uV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYXR0YWNobWVudHMvcHJvbXB0QXR0YWNobWVudHMvcHJvbXB0QXR0YWNobWVudHNDb2xsZWN0aW9uV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBR3hHOzs7R0FHRztBQUNJLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQWtDLFNBQVEsVUFBVTtJQVloRTs7O09BR0c7SUFDSSx3QkFBd0IsQ0FBQyxRQUF1QjtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUU5RCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFPRDs7O09BR0c7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQTtJQUM3QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxlQUFlO1FBQ3pCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUE7SUFDbEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxLQUFLO1FBQ2YsT0FB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