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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { FilePromptParser } from '../../common/promptSyntax/parsers/filePromptParser.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
/**
 * Model for a single chat prompt instructions attachment.
 */
let ChatPromptAttachmentModel = class ChatPromptAttachmentModel extends Disposable {
    /**
     * Get the prompt instructions reference instance.
     */
    get reference() {
        return this._reference;
    }
    /**
     * Get `URI` for the main reference and `URI`s of all valid child
     * references it may contain, including reference of this model itself.
     */
    get references() {
        const { reference } = this;
        const { errorCondition } = this.reference;
        // return no references if the attachment is disabled
        // or if this object itself has an error
        if (errorCondition) {
            return [];
        }
        // otherwise return `URI` for the main reference and
        // all valid child `URI` references it may contain
        return [...reference.allValidReferencesUris, reference.uri];
    }
    /**
     * Promise that resolves when the prompt is fully parsed,
     * including all its possible nested child references.
     */
    get allSettled() {
        return this.reference.allSettled();
    }
    /**
     * Get the top-level error of the prompt instructions
     * reference, if any.
     */
    get topError() {
        return this.reference.topError;
    }
    /**
     * Subscribe to the `onUpdate` event.
     * @param callback Function to invoke on update.
     */
    onUpdate(callback) {
        this._register(this._onUpdate.event(callback));
        return this;
    }
    /**
     * Subscribe to the `onDispose` event.
     * @param callback Function to invoke on dispose.
     */
    onDispose(callback) {
        this._register(this._onDispose.event(callback));
        return this;
    }
    constructor(uri, initService) {
        super();
        this.initService = initService;
        /**
         * Event that fires when the error condition of the prompt
         * reference changes.
         *
         * See {@linkcode onUpdate}.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Event that fires when the object is disposed.
         *
         * See {@linkcode onDispose}.
         */
        this._onDispose = this._register(new Emitter());
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
        this._reference = this._register(this.initService.createInstance(FilePromptParser, uri, [])).onUpdate(this._onUpdate.fire);
    }
    /**
     * Start resolving the prompt instructions reference and child references
     * that it may contain.
     */
    resolve() {
        this._reference.start();
        return this;
    }
    dispose() {
        this._onDispose.fire();
        super.dispose();
    }
};
ChatPromptAttachmentModel = __decorate([
    __param(1, IInstantiationService)
], ChatPromptAttachmentModel);
export { ChatPromptAttachmentModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBdHRhY2htZW50TW9kZWwvY2hhdFByb21wdEF0dGFjaG1lbnRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHOztHQUVHO0FBQ0ksSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBTXhEOztPQUVHO0lBQ0gsSUFBVyxTQUFTO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQTtJQUN2QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxVQUFVO1FBQ3BCLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUE7UUFDMUIsTUFBTSxFQUFFLGNBQWMsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUE7UUFFekMscURBQXFEO1FBQ3JELHdDQUF3QztRQUN4QyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELG9EQUFvRDtRQUNwRCxrREFBa0Q7UUFDbEQsT0FBTyxDQUFDLEdBQUcsU0FBUyxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxVQUFVO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUNuQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUE7SUFDL0IsQ0FBQztJQVNEOzs7T0FHRztJQUNJLFFBQVEsQ0FBQyxRQUF1QjtRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFOUMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBUUQ7OztPQUdHO0lBQ0ksU0FBUyxDQUFDLFFBQXVCO1FBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxZQUNDLEdBQVEsRUFDZSxXQUFtRDtRQUUxRSxLQUFLLEVBQUUsQ0FBQTtRQUZpQyxnQkFBVyxHQUFYLFdBQVcsQ0FBdUI7UUFuQzNFOzs7OztXQUtHO1FBQ08sY0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBV3pEOzs7O1dBSUc7UUFDTyxlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFpQnpELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMvQixJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQzFELENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVEOzs7T0FHRztJQUNJLE9BQU87UUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRXZCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVlLE9BQU87UUFDdEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUV0QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztDQUNELENBQUE7QUE1R1kseUJBQXlCO0lBbUZuQyxXQUFBLHFCQUFxQixDQUFBO0dBbkZYLHlCQUF5QixDQTRHckMifQ==