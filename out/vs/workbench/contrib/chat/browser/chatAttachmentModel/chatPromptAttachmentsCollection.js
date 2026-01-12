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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBdHRhY2htZW50TW9kZWwvY2hhdFByb21wdEF0dGFjaG1lbnRzQ29sbGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFN0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWhGLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckc7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsQ0FDN0IsU0FBNkQsRUFDN0QsTUFBZSxFQUNhLEVBQUU7SUFDOUIsTUFBTSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLEdBQUcsU0FBUyxDQUFBO0lBRXJELHdDQUF3QztJQUN4QyxJQUFJLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFBO0lBRWpCLGdEQUFnRDtJQUNoRCxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2xCLHVEQUF1RDtRQUN2RCxJQUFJLE1BQU0sR0FBRyw0QkFBNEIsQ0FBQTtRQUN6Qyw4REFBOEQ7UUFDOUQsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxPQUFPLENBQUE7UUFDbEIs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