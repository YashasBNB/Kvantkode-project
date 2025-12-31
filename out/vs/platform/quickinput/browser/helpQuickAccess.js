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
var HelpQuickAccessProvider_1;
import { localize } from '../../../nls.js';
import { Registry } from '../../registry/common/platform.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { Extensions, } from '../common/quickAccess.js';
import { IQuickInputService } from '../common/quickInput.js';
let HelpQuickAccessProvider = class HelpQuickAccessProvider {
    static { HelpQuickAccessProvider_1 = this; }
    static { this.PREFIX = '?'; }
    constructor(quickInputService, keybindingService) {
        this.quickInputService = quickInputService;
        this.keybindingService = keybindingService;
        this.registry = Registry.as(Extensions.Quickaccess);
    }
    provide(picker) {
        const disposables = new DisposableStore();
        // Open a picker with the selected value if picked
        disposables.add(picker.onDidAccept(() => {
            const [item] = picker.selectedItems;
            if (item) {
                this.quickInputService.quickAccess.show(item.prefix, { preserveValue: true });
            }
        }));
        // Also open a picker when we detect the user typed the exact
        // name of a provider (e.g. `?term` for terminals)
        disposables.add(picker.onDidChangeValue((value) => {
            const providerDescriptor = this.registry.getQuickAccessProvider(value.substr(HelpQuickAccessProvider_1.PREFIX.length));
            if (providerDescriptor &&
                providerDescriptor.prefix &&
                providerDescriptor.prefix !== HelpQuickAccessProvider_1.PREFIX) {
                this.quickInputService.quickAccess.show(providerDescriptor.prefix, {
                    preserveValue: true,
                });
            }
        }));
        // Fill in all providers
        picker.items = this.getQuickAccessProviders().filter((p) => p.prefix !== HelpQuickAccessProvider_1.PREFIX);
        return disposables;
    }
    getQuickAccessProviders() {
        const providers = this.registry
            .getQuickAccessProviders()
            .sort((providerA, providerB) => providerA.prefix.localeCompare(providerB.prefix))
            .flatMap((provider) => this.createPicks(provider));
        return providers;
    }
    createPicks(provider) {
        return provider.helpEntries.map((helpEntry) => {
            const prefix = helpEntry.prefix || provider.prefix;
            const label = prefix || '\u2026'; /* ... */
            return {
                prefix,
                label,
                keybinding: helpEntry.commandId
                    ? this.keybindingService.lookupKeybinding(helpEntry.commandId)
                    : undefined,
                ariaLabel: localize('helpPickAriaLabel', '{0}, {1}', label, helpEntry.description),
                description: helpEntry.description,
            };
        });
    }
};
HelpQuickAccessProvider = HelpQuickAccessProvider_1 = __decorate([
    __param(0, IQuickInputService),
    __param(1, IKeybindingService)
], HelpQuickAccessProvider);
export { HelpQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL2hlbHBRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUNOLFVBQVUsR0FJVixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBOEIsTUFBTSx5QkFBeUIsQ0FBQTtBQU1qRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1Qjs7YUFDNUIsV0FBTSxHQUFHLEdBQUcsQUFBTixDQUFNO0lBSW5CLFlBQ3FCLGlCQUFzRCxFQUN0RCxpQkFBc0Q7UUFEckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBSjFELGFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7SUFLbEYsQ0FBQztJQUVKLE9BQU8sQ0FBQyxNQUFxRTtRQUM1RSxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXpDLGtEQUFrRDtRQUNsRCxXQUFXLENBQUMsR0FBRyxDQUNkLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsYUFBYSxDQUFBO1lBQ25D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