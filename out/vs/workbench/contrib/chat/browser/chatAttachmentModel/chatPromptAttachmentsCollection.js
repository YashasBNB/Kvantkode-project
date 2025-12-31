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
import { ChatPromptAttachmentModel } from './chatPromptAttachmentModel.js';
import { PromptsConfig } from '../../../../../platform/prompts/common/config.js';
import { Disposable, DisposableMap } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
/**
 * Utility to convert a {@link reference} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt file references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt file references
 * - `<URI>`: for the rest of references(the ones that do not point to a prompt file)
 *
 * @param reference A reference object to convert to a chat variable entry.
 * @param isRoot If the reference is the root reference in the references tree.
 * 				 This object most likely was explicitly attached by the user.
 */
export const toChatVariable = (reference, isRoot) => {
    const { uri, isPromptFile: isPromptFile } = reference;
    // default `id` is the stringified `URI`
    let id = `${uri}`;
    // for prompt files, we add a prefix to the `id`
    if (isPromptFile) {
        // the default prefix that is used for all prompt files
        let prefix = 'vscode.prompt.instructions';
        // if the reference is the root object, add the `.root` suffix
        if (isRoot) {
            prefix += '.root';
        }
        // final `id` for all `prompt files` starts with the well-defined
        // part that the copilot extension(or other chatbot) can rely on
        id = `${prefix}__${id}`;
    }
    return {
        id,
        name: uri.fsPath,
        value: uri,
        isSelection: false,
        enabled: true,
        isFile: true,
    };
};
/**
 * Model for a collection of prompt instruction attachments.
 * See {@linkcode ChatPromptAttachmentModel} for individual attachment.
 */
let ChatPromptAttachmentsCollection = class ChatPromptAttachmentsCollection extends Disposable {
    /**
     * Get all `URI`s of all valid references, including all
     * the possible references nested inside the children.
     */
    get references() {
        const result = [];
        for (const child of this.attachments.values()) {
            result.push(...child.references);
        }
        return result;
    }
    /**
     * Get the list of all prompt instruction attachment variables, including all
     * nested child references of each attachment explicitly attached by user.
     */
    get chatAttachments() {
        const result = [];
        const attachments = [...this.attachments.values()];
        for (const attachment of attachments) {
            const { reference } = attachment;
            // the usual URIs list of prompt instructions is `bottom-up`, therefore
            // we do the same herfe - first add all child references of the model
            result.push(...reference.allValidReferences.map((link) => {
                return toChatVariable(link, false);
            }));
            // then add the root reference of the model itself
            result.push(toChatVariable(reference, true));
        }
        return result;
    }
    /**
     * Promise that resolves when parsing of all attached prompt instruction
     * files completes, including parsing of all its possible child references.
     */
    async allSettled() {
        const attachments = [...this.attachments.values()];
        await Promise.allSettled(attachments.map((attachment) => {
            return attachment.allSettled;
        }));
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
     * The `onAdd` event fires when a new prompt instruction attachment is added.
     *
     * @param callback Function to invoke on add.
     */
    onAdd(callback) {
        this._register(this._onAdd.event(callback));
        return this;
    }
    constructor(initService, configService) {
        super();
        this.initService = initService;
        this.configService = configService;
        /**
         * List of all prompt instruction attachments.
         */
        this.attachments = this._register(new DisposableMap());
        /**
         * Event that fires then this model is updated.
         *
         * See {@linkcode onUpdate}.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Event that fires when a new prompt instruction attachment is added.
         * See {@linkcode onAdd}.
         */
        this._onAdd = this._register(new Emitter());
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
    }
    /**
     * Add a prompt instruction attachment instance with the provided `URI`.
     * @param uri URI of the prompt instruction attachment to add.
     */
    add(uri) {
        // if already exists, nothing to do
        if (this.attachments.has(uri.path)) {
            return this;
        }
        const instruction = this.initService
            .createInstance(ChatPromptAttachmentModel, uri)
            .onUpdate(this._onUpdate.fire)
            .onDispose(() => {
            // note! we have to use `deleteAndLeak` here, because the `*AndDispose`
            //       alternative results in an infinite loop of calling this callback
            this.attachments.deleteAndLeak(uri.path);
            this._onUpdate.fire();
        });
        this.attachments.set(uri.path, instruction);
        instruction.resolve();
        this._onAdd.fire(instruction);
        this._onUpdate.fire();
        return this;
    }
    /**
     * Remove a prompt instruction attachment instance by provided `URI`.
     * @param uri URI of the prompt instruction attachment to remove.
     */
    remove(uri) {
        // if does not exist, nothing to do
        if (!this.attachments.has(uri.path)) {
            return this;
        }
        this.attachments.deleteAndDispose(uri.path);
        return this;
    }
    /**
     * Checks if the prompt instructions feature is enabled in the user settings.
     */
    get featureEnabled() {
        return PromptsConfig.enabled(this.configService);
    }
};
ChatPromptAttachmentsCollection = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService)
], ChatPromptAttachmentsCollection);
export { ChatPromptAttachmentsCollection };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudE1vZGVsL2NoYXRQcm9tcHRBdHRhY2htZW50c0NvbGxlY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHOzs7Ozs7Ozs7OztHQVdHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLENBQzdCLFNBQTZELEVBQzdELE1BQWUsRUFDYSxFQUFFO0lBQzlCLE1BQU0sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxHQUFHLFNBQVMsQ0FBQTtJQUVyRCx3Q0FBd0M7SUFDeEMsSUFBSSxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQTtJQUVqQixnREFBZ0Q7SUFDaEQsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQix1REFBdUQ7UUFDdkQsSUFBSSxNQUFNLEdBQUcsNEJBQTRCLENBQUE7UUFDekMsOERBQThEO1FBQzlELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksT0FBTyxDQUFBO1FBQ2xCLENBQUM7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