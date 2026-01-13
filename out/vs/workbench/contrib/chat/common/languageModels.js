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
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionService, isProposedApiEnabled, } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { ChatContextKeys } from './chatContextKeys.js';
export var ChatMessageRole;
(function (ChatMessageRole) {
    ChatMessageRole[ChatMessageRole["System"] = 0] = "System";
    ChatMessageRole[ChatMessageRole["User"] = 1] = "User";
    ChatMessageRole[ChatMessageRole["Assistant"] = 2] = "Assistant";
})(ChatMessageRole || (ChatMessageRole = {}));
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
/**
 * Specifies the detail level of the image.
 */
export var ImageDetailLevel;
(function (ImageDetailLevel) {
    ImageDetailLevel["Low"] = "low";
    ImageDetailLevel["High"] = "high";
})(ImageDetailLevel || (ImageDetailLevel = {}));
export const ILanguageModelsService = createDecorator('ILanguageModelsService');
const languageModelType = {
    type: 'object',
    properties: {
        vendor: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.vendor', 'A globally unique vendor of language models.'),
        },
    },
};
export const languageModelExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModels',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languageModels', 'Contribute language models of a specific vendor.'),
        oneOf: [
            languageModelType,
            {
                type: 'array',
                items: languageModelType,
            },
        ],
    },
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            result.push(`onLanguageModelChat:${contrib.vendor}`);
        }
    },
});
let LanguageModelsService = class LanguageModelsService {
    constructor(_extensionService, _logService, _contextKeyService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._contextKeyService = _contextKeyService;
        this._store = new DisposableStore();
        this._providers = new Map();
        this._vendors = new Set();
        this._onDidChangeProviders = this._store.add(new Emitter());
        this.onDidChangeLanguageModels = this._onDidChangeProviders.event;
        this._hasUserSelectableModels = ChatContextKeys.languageModelsAreUserSelectable.bindTo(this._contextKeyService);
        this._store.add(languageModelExtensionPoint.setHandler((extensions) => {
            this._vendors.clear();
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'chatProvider')) {
                    extension.collector.error(localize('vscode.extension.contributes.languageModels.chatProviderRequired', "This contribution point requires the 'chatProvider' proposal."));
                    continue;
                }
                for (const item of Iterable.wrap(extension.value)) {
                    if (this._vendors.has(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.vendorAlreadyRegistered', "The vendor '{0}' is already registered and cannot be registered twice", item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.emptyVendor', 'The vendor field cannot be empty.'));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.whitespaceVendor', 'The vendor field cannot start or end with whitespace.'));
                        continue;
                    }
                    this._vendors.add(item.vendor);
                }
            }
            const removed = [];
            for (const [identifier, value] of this._providers) {
                if (!this._vendors.has(value.metadata.vendor)) {
                    this._providers.delete(identifier);
                    removed.push(identifier);
                }
            }
            if (removed.length > 0) {
                this._onDidChangeProviders.fire({ removed });
            }
        }));
    }
    dispose() {
        this._store.dispose();
        this._providers.clear();
    }
    getLanguageModelIds() {
        return Array.from(this._providers.keys());
    }
    lookupLanguageModel(identifier) {
        return this._providers.get(identifier)?.metadata;
    }
    async selectLanguageModels(selector) {
        if (selector.vendor) {
            // selective activation
            await this._extensionService.activateByEvent(`onLanguageModelChat:${selector.vendor}}`);
        }
        else {
            // activate all extensions that do language models
            const all = Array.from(this._vendors).map((vendor) => this._extensionService.activateByEvent(`onLanguageModelChat:${vendor}`));
            await Promise.all(all);
        }
        const result = [];
        for (const [identifier, model] of this._providers) {
            if ((selector.vendor === undefined || model.metadata.vendor === selector.vendor) &&
                (selector.family === undefined || model.metadata.family === selector.family) &&
                (selector.version === undefined || model.metadata.version === selector.version) &&
                (selector.id === undefined || model.metadata.id === selector.id) &&
                (!model.metadata.targetExtensions ||
                    model.metadata.targetExtensions.some((candidate) => ExtensionIdentifier.equals(candidate, selector.extension)))) {
                result.push(identifier);
            }
        }
        this._logService.trace('[LM] selected language models', selector, result);
        return result;
    }
    registerLanguageModelChat(identifier, provider) {
        this._logService.trace('[LM] registering language model chat', identifier, provider.metadata);
        if (!this._vendors.has(provider.metadata.vendor)) {
            throw new Error(`Chat response provider uses UNKNOWN vendor ${provider.metadata.vendor}.`);
        }
        if (this._providers.has(identifier)) {
            throw new Error(`Chat response provider with identifier ${identifier} is already registered.`);
        }
        this._providers.set(identifier, provider);
        this._onDidChangeProviders.fire({ added: [{ identifier, metadata: provider.metadata }] });
        this.updateUserSelectableModelsContext();
        return toDisposable(() => {
            this.updateUserSelectableModelsContext();
            if (this._providers.delete(identifier)) {
                this._onDidChangeProviders.fire({ removed: [identifier] });
                this._logService.trace('[LM] UNregistered language model chat', identifier, provider.metadata);
            }
        });
    }
    updateUserSelectableModelsContext() {
        // This context key to enable the picker is set when there is a default model, and there is at least one other model that is user selectable
        const hasUserSelectableModels = Array.from(this._providers.values()).some((p) => p.metadata.isUserSelectable && !p.metadata.isDefault);
        const hasDefaultModel = Array.from(this._providers.values()).some((p) => p.metadata.isDefault);
        this._hasUserSelectableModels.set(hasUserSelectableModels && hasDefaultModel);
    }
    async sendChatRequest(identifier, from, messages, options, token) {
        const provider = this._providers.get(identifier);
        if (!provider) {
            throw new Error(`Chat response provider with identifier ${identifier} is not registered.`);
        }
        return provider.sendChatRequest(messages, from, options, token);
    }
    computeTokenLength(identifier, message, token) {
        const provider = this._providers.get(identifier);
        if (!provider) {
            throw new Error(`Chat response provider with identifier ${identifier} is not registered.`);
        }
        return provider.provideTokenCount(message, token);
    }
};
LanguageModelsService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IContextKeyService)
], LanguageModelsService);
export { LanguageModelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2xhbmd1YWdlTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixvQkFBb0IsR0FDcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFdEQsTUFBTSxDQUFOLElBQWtCLGVBSWpCO0FBSkQsV0FBa0IsZUFBZTtJQUNoQyx5REFBTSxDQUFBO0lBQ04scURBQUksQ0FBQTtJQUNKLCtEQUFTLENBQUE7QUFDVixDQUFDLEVBSmlCLGVBQWUs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