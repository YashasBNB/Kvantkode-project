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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsb0JBQW9CLEdBQ3BCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXRELE1BQU0sQ0FBTixJQUFrQixlQUlqQjtBQUpELFdBQWtCLGVBQWU7SUFDaEMseURBQU0sQ0FBQTtJQUNOLHFEQUFJLENBQUE7SUFDSiwrREFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUppQixlQUFlLEtBQWYsZUFBZSxRQUloQztBQXdCRDs7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