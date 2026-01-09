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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvY29tbW9uL3F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFTN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBZ0Y1RCxNQUFNLENBQU4sSUFBWSw2QkFVWDtBQVZELFdBQVksNkJBQTZCO0lBQ3hDOztPQUVHO0lBQ0gseUZBQVksQ0FBQTtJQUVaOztPQUVHO0lBQ0gsaUZBQVEsQ0FBQTtBQUNULENBQUMsRUFWVyw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBVXhDO0FBb0dELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixXQUFXLEVBQUUscUNBQXFDO0NBQ2xELENBQUE7QUFtQkQsTUFBTSxPQUFPLG1CQUFtQjtJQUFoQztRQUNTLGNBQVMsR0FBcUMsRUFBRSxDQUFBO1FBQ2hELG9CQUFlLEdBQStDLFNBQVMsQ0FBQTtJQStDaEYsQ0FBQztJQTdDQSwyQkFBMkIsQ0FBQyxRQUF3QztRQUNuRSx5REFBeUQ7UUFDekQsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsZUFBZSxHQUFHLFFBQVEsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUseUVBQXlFO1FBQ3pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUVoRyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7WUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFMUQsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN2QyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQTtZQUNqQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsdUJBQXVCO1FBQ3RCLE9BQU8sUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxNQUFjO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLE1BQU07WUFDcEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLFNBQVM7WUFDcEYsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUVaLE9BQU8sTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDdEMsQ0FBQztJQUVELEtBQUs7UUFDSixNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3JDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFFNUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUE7UUFFaEMsT0FBTyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtZQUMxQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtRQUN2QyxDQUFDLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLEVBQUUsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUEifQ==