/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../base/common/arrays.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { Registry } from '../../registry/common/platform.js';
export var DefaultQuickAccessFilterValue;
(function (DefaultQuickAccessFilterValue) {
    /**
     * Keep the value as it is given to quick access.
     */
    DefaultQuickAccessFilterValue[DefaultQuickAccessFilterValue["PRESERVE"] = 0] = "PRESERVE";
    /**
     * Use the value that was used last time something was accepted from the picker.
     */
    DefaultQuickAccessFilterValue[DefaultQuickAccessFilterValue["LAST"] = 1] = "LAST";
})(DefaultQuickAccessFilterValue || (DefaultQuickAccessFilterValue = {}));
export const Extensions = {
    Quickaccess: 'workbench.contributions.quickaccess',
};
export class QuickAccessRegistry {
    constructor() {
        this.providers = [];
        this.defaultProvider = undefined;
    }
    registerQuickAccessProvider(provider) {
        // Extract the default provider when no prefix is present
        if (provider.prefix.length === 0) {
            this.defaultProvider = provider;
        }
        else {
            this.providers.push(provider);
        }
        // sort the providers by decreasing prefix length, such that longer
        // prefixes take priority: 'ext' vs 'ext install' - the latter should win
        this.providers.sort((providerA, providerB) => providerB.prefix.length - providerA.prefix.length);
        return toDisposable(() => {
            this.providers.splice(this.providers.indexOf(provider), 1);
            if (this.defaultProvider === provider) {
                this.defaultProvider = undefined;
            }
        });
    }
    getQuickAccessProviders() {
        return coalesce([this.defaultProvider, ...this.providers]);
    }
    getQuickAccessProvider(prefix) {
        const result = prefix
            ? this.providers.find((provider) => prefix.startsWith(provider.prefix)) || undefined
            : undefined;
        return result || this.defaultProvider;
    }
    clear() {
        const providers = [...this.providers];
        const defaultProvider = this.defaultProvider;
        this.providers = [];
        this.defaultProvider = undefined;
        return () => {
            this.providers = providers;
            this.defaultProvider = defaultProvider;
        };
    }
}
Registry.add(Extensions.Quickaccess, new QuickAccessRegistry());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2NvbW1vbi9xdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQWdGNUQsTUFBTSxDQUFOLElBQVksNkJBVVg7QUFWRCxXQUFZLDZCQUE2QjtJQUN4Qzs7T0FFRztJQUNILHlGQUFZLENBQUE7SUFFWjs7T0FFRztJQUNILGlGQUFRLENBQUE7QUFDVCxDQUFDLEVBVlcsNkJBQTZCLEtBQTdCLDZCQUE2QixRQVV4QztBQW9HRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUc7SUFDekIsV0FBVyxFQUFFLHFDQUFxQztDQUNsRCxDQUFBO0FBbUJELE1BQU0sT0FBTyxtQkFBbUI7SUFBaEM7UUFDUyxjQUFTLEdBQXFDLEVBQUUsQ0FBQTtRQUNoRCxvQkFBZSxHQUErQyxTQUFTLENBQUE7SUErQ2hGLENBQUM7SUE3Q0EsMkJBQTJCLENBQUMsUUFBd0M7UUFDbkUseURBQXlEO1FBQ3pELElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUE7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLHlFQUF5RTtRQUN6RSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFaEcsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTFELElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELHVCQUF1QjtRQUN0QixPQUFPLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsc0JBQXNCLENBQUMsTUFBYztRQUNwQyxNQUFNLE1BQU0sR0FBRyxNQUFNO1lBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxTQUFTO1lBQ3BGLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFFWixPQUFPLE1BQU0sSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxLQUFLO1FBQ0osTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFBO1FBRTVDLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFBO1FBRWhDLE9BQU8sR0FBRyxFQUFFO1lBQ1gsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7WUFDMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUE7UUFDdkMsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLElBQUksbUJBQW1CLEVBQUUsQ0FBQyxDQUFBIn0=