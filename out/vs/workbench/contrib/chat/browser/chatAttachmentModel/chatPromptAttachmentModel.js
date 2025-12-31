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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudE1vZGVsL2NoYXRQcm9tcHRBdHRhY2htZW50TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRzs7R0FFRztBQUNJLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTtJQU14RDs7T0FFRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsVUFBVTtRQUNwQixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFBO1FBQzFCLE1BQU0sRUFBRSxjQUFjLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBRXpDLHFEQUFxRDtRQUNyRCx3Q0FBd0M7UUFDeEMsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxvREFBb0Q7UUFDcEQsa0RBQWtEO1FBQ2xELE9BQU8sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUQsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsVUFBVTtRQUNwQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDbkMsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsUUFBUTtRQUNsQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFBO0lBQy9CLENBQUM7SUFTRDs7O09BR0c7SUFDSSxRQUFRLENBQUMsUUFBdUI7UUFDdEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBRTlDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQVFEOzs7T0FHRztJQUNJLFNBQVMsQ0FBQyxRQUF1QjtRQUN2QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFL0MsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsWUFDQyxHQUFRLEVBQ2UsV0FBbUQ7UUFFMUUsS0FBSyxFQUFFLENBQUE7UUFGaUMsZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1FBbkMzRTs7Ozs7V0FLRztRQUNPLGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQVd6RDs7OztXQUlHO1FBQ08sZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFBO1FBaUJ6RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDL0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUMxRCxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ2hDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxPQUFPO1FBQ2IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUV2QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFZSxPQUFPO1FBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7Q0FDRCxDQUFBO0FBNUdZLHlCQUF5QjtJQW1GbkMsV0FBQSxxQkFBcUIsQ0FBQTtHQW5GWCx5QkFBeUIsQ0E0R3JDIn0=