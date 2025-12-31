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
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { isWeb } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import * as languages from '../../../../editor/common/languages.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultExternalUriOpenerId, externalUriOpenersSettingId, } from './configuration.js';
import { testUrlMatchesGlob } from '../../url/common/urlGlob.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
export const IExternalUriOpenerService = createDecorator('externalUriOpenerService');
let ExternalUriOpenerService = class ExternalUriOpenerService extends Disposable {
    constructor(openerService, configurationService, logService, preferencesService, quickInputService) {
        super();
        this.configurationService = configurationService;
        this.logService = logService;
        this.preferencesService = preferencesService;
        this.quickInputService = quickInputService;
        this._providers = new LinkedList();
        this._register(openerService.registerExternalOpener(this));
    }
    registerExternalOpenerProvider(provider) {
        const remove = this._providers.push(provider);
        return { dispose: remove };
    }
    async getOpeners(targetUri, allowOptional, ctx, token) {
        const allOpeners = await this.getAllOpenersForUri(targetUri);
        if (allOpeners.size === 0) {
            return [];
        }
        // First see if we have a preferredOpener
        if (ctx.preferredOpenerId) {
            if (ctx.preferredOpenerId === defaultExternalUriOpenerId) {
                return [];
            }
            const preferredOpener = allOpeners.get(ctx.preferredOpenerId);
            if (preferredOpener) {
                // Skip the `canOpen` check here since the opener was specifically requested.
                return [preferredOpener];
            }
        }
        // Check to see if we have a configured opener
        const configuredOpener = this.getConfiguredOpenerForUri(allOpeners, targetUri);
        if (configuredOpener) {
            // Skip the `canOpen` check here since the opener was specifically requested.
            return configuredOpener === defaultExternalUriOpenerId ? [] : [configuredOpener];
        }
        // Then check to see if there is a valid opener
        const validOpeners = [];
        await Promise.all(Array.from(allOpeners.values()).map(async (opener) => {
            let priority;
            try {
                priority = await opener.canOpen(ctx.sourceUri, token);
            }
            catch (e) {
                this.logService.error(e);
                return;
            }
            switch (priority) {
                case languages.ExternalUriOpenerPriority.Option:
                case languages.ExternalUriOpenerPriority.Default:
                case languages.ExternalUriOpenerPriority.Preferred:
                    validOpeners.push({ opener, priority });
                    break;
            }
        }));
        if (validOpeners.length === 0) {
            return [];
        }
        // See if we have a preferred opener first
        const preferred = validOpeners
            .filter((x) => x.priority === languages.ExternalUriOpenerPriority.Preferred)
            .at(0);
        if (preferred) {
            return [preferred.opener];
        }
        // See if we only have optional openers, use the default opener
        if (!allowOptional &&
            validOpeners.every((x) => x.priority === languages.ExternalUriOpenerPriority.Option)) {
            return [];
        }
        return validOpeners.map((value) => value.opener);
    }
    async openExternal(href, ctx, token) {
        const targetUri = typeof href === 'string' ? URI.parse(href) : href;
        const allOpeners = await this.getOpeners(targetUri, false, ctx, token);
        if (allOpeners.length === 0) {
            return false;
        }
        else if (allOpeners.length === 1) {
            return allOpeners[0].openExternalUri(targetUri, ctx, token);
        }
        // Otherwise prompt
        return this.showOpenerPrompt(allOpeners, targetUri, ctx, token);
    }
    async getOpener(targetUri, ctx, token) {
        const allOpeners = await this.getOpeners(targetUri, true, ctx, token);
        if (allOpeners.length >= 1) {
            return allOpeners[0];
        }
        return undefined;
    }
    async getAllOpenersForUri(targetUri) {
        const allOpeners = new Map();
        await Promise.all(Iterable.map(this._providers, async (provider) => {
            for await (const opener of provider.getOpeners(targetUri)) {
                allOpeners.set(opener.id, opener);
            }
        }));
        return allOpeners;
    }
    getConfiguredOpenerForUri(openers, targetUri) {
        const config = this.configurationService.getValue(externalUriOpenersSettingId) || {};
        for (const [uriGlob, id] of Object.entries(config)) {
            if (testUrlMatchesGlob(targetUri, uriGlob)) {
                if (id === defaultExternalUriOpenerId) {
                    return 'default';
                }
                const entry = openers.get(id);
                if (entry) {
                    return entry;
                }
            }
        }
        return undefined;
    }
    async showOpenerPrompt(openers, targetUri, ctx, token) {
        const items = openers.map((opener) => {
            return {
                label: opener.label,
                opener: opener,
            };
        });
        items.push({
            label: isWeb
                ? nls.localize('selectOpenerDefaultLabel.web', 'Open in new browser window')
                : nls.localize('selectOpenerDefaultLabel', 'Open in default browser'),
            opener: undefined,
        }, { type: 'separator' }, {
            label: nls.localize('selectOpenerConfigureTitle', 'Configure default opener...'),
            opener: 'configureDefault',
        });
        const picked = await this.quickInputService.pick(items, {
            placeHolder: nls.localize('selectOpenerPlaceHolder', 'How would you like to open: {0}', targetUri.toString()),
        });
        if (!picked) {
            // Still cancel the default opener here since we prompted the user
            return true;
        }
        if (typeof picked.opener === 'undefined') {
            return false; // Fallback to default opener
        }
        else if (picked.opener === 'configureDefault') {
            await this.preferencesService.openUserSettings({
                jsonEditor: true,
                revealSetting: { key: externalUriOpenersSettingId, edit: true },
            });
            return true;
        }
        else {
            return picked.opener.openExternalUri(targetUri, ctx, token);
        }
    }
};
ExternalUriOpenerService = __decorate([
    __param(0, IOpenerService),
    __param(1, IConfigurationService),
    __param(2, ILogService),
    __param(3, IPreferencesService),
    __param(4, IQuickInputService)
], ExternalUriOpenerService);
export { ExternalUriOpenerService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxVcmlPcGVuZXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZXJuYWxVcmlPcGVuZXIvY29tbW9uL2V4dGVybmFsVXJpT3BlbmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUYsT0FBTyxFQUNOLGtCQUFrQixHQUdsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTiwwQkFBMEIsRUFFMUIsMkJBQTJCLEdBQzNCLE1BQU0sb0JBQW9CLENBQUE7QUFDM0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFE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