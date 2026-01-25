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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVscFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvaGVscFF1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sVUFBVSxHQUlWLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUE4QixNQUFNLHlCQUF5QixDQUFBO0FBTWpGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCOzthQUM1QixXQUFNLEdBQUcsR0FBRyxBQUFOLENBQU07SUFJbkIsWUFDcUIsaUJBQXNELEVBQ3RELGlCQUFzRDtRQURyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFKMUQsYUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUtsRixDQUFDO0lBRUosT0FBTyxDQUFDLE1BQXFFO1FBQzVFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekMsa0RBQWtEO1FBQ2xELFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUE7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