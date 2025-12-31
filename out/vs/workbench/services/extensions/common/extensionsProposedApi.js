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
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { localize } from '../../../../nls.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ExtensionIdentifier, } from '../../../../platform/extensions/common/extensions.js';
import { allApiProposals, } from '../../../../platform/extensions/common/extensionsApiProposals.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { Extensions, } from '../../extensionManagement/common/extensionFeatures.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
let ExtensionsProposedApi = class ExtensionsProposedApi {
    constructor(_logService, _environmentService, productService) {
        this._logService = _logService;
        this._environmentService = _environmentService;
        this._envEnabledExtensions = new Set((_environmentService.extensionEnabledProposedApi ?? []).map((id) => ExtensionIdentifier.toKey(id)));
        this._envEnablesProposedApiForAll =
            !_environmentService.isBuilt || // always allow proposed API when running out of sources
                (_environmentService.isExtensionDevelopment && productService.quality !== 'stable') || // do not allow proposed API against stable builds when developing an extension
                (this._envEnabledExtensions.size === 0 &&
                    Array.isArray(_environmentService.extensionEnabledProposedApi)); // always allow proposed API if --enable-proposed-api is provided without extension ID
        this._productEnabledExtensions = new Map();
        // NEW world - product.json spells out what proposals each extension can use
        if (productService.extensionEnabledApiProposals) {
            for (const [k, value] of Object.entries(productService.extensionEnabledApiProposals)) {
                const key = ExtensionIdentifier.toKey(k);
                const proposalNames = value.filter((name) => {
                    if (!allApiProposals[name]) {
                        _logService.warn(`Via 'product.json#extensionEnabledApiProposals' extension '${key}' wants API proposal '${name}' but that proposal DOES NOT EXIST. Likely, the proposal has been finalized (check 'vscode.d.ts') or was abandoned.`);
                        return false;
                    }
                    return true;
                });
                this._productEnabledExtensions.set(key, proposalNames);
            }
        }
    }
    updateEnabledApiProposals(extensions) {
        for (const extension of extensions) {
            this.doUpdateEnabledApiProposals(extension);
        }
    }
    doUpdateEnabledApiProposals(extension) {
        const key = ExtensionIdentifier.toKey(extension.identifier);
        // warn about invalid proposal and remove them from the list
        if (isNonEmptyArray(extension.enabledApiProposals)) {
            extension.enabledApiProposals = extension.enabledApiProposals.filter((name) => {
                const result = Boolean(allApiProposals[name]);
                if (!result) {
                    this._logService.error(`Extension '${key}' wants API proposal '${name}' but that proposal DOES NOT EXIST. Likely, the proposal has been finalized (check 'vscode.d.ts') or was abandoned.`);
                }
                return result;
            });
        }
        if (this._productEnabledExtensions.has(key)) {
            // NOTE that proposals that are listed in product.json override whatever is declared in the extension
            // itself. This is needed for us to know what proposals are used "in the wild". Merging product.json-proposals
            // and extension-proposals would break that.
            const productEnabledProposals = this._productEnabledExtensions.get(key);
            // check for difference between product.json-declaration and package.json-declaration
            const productSet = new Set(productEnabledProposals);
            const extensionSet = new Set(extension.enabledApiProposals);
            const diff = new Set([...extensionSet].filter((a) => !productSet.has(a)));
            if (diff.size > 0) {
                this._logService.error(`Extension '${key}' appears in product.json but enables LESS API proposals than the extension wants.\npackage.json (LOSES): ${[...extensionSet].join(', ')}\nproduct.json (WINS): ${[...productSet].join(', ')}`);
                if (this._environmentService.isExtensionDevelopment) {
                    this._logService.error(`Proceeding with EXTRA proposals (${[...diff].join(', ')}) because extension is in development mode. Still, this EXTENSION WILL BE BROKEN unless product.json is updated.`);
                    productEnabledProposals.push(...diff);
                }
            }
            extension.enabledApiProposals = productEnabledProposals;
            return;
        }
        if (this._envEnablesProposedApiForAll || this._envEnabledExtensions.has(key)) {
            // proposed API usage is not restricted and allowed just like the extension
            // has declared it
            return;
        }
        if (!extension.isBuiltin && isNonEmptyArray(extension.enabledApiProposals)) {
            // restrictive: extension cannot use proposed API in this context and its declaration is nulled
            this._logService.error(`Extension '${extension.identifier.value} CANNOT USE these API proposals '${extension.enabledApiProposals?.join(', ') || '*'}'. You MUST start in extension development mode or use the --enable-proposed-api command line flag`);
            extension.enabledApiProposals = [];
        }
    }
};
ExtensionsProposedApi = __decorate([
    __param(0, ILogService),
    __param(1, IWorkbenchEnvironmentService),
    __param(2, IProductService)
], ExtensionsProposedApi);
export { ExtensionsProposedApi };
class ApiProposalsMarkdowneRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'markdown';
    }
    shouldRender(manifest) {
        return !!manifest.originalEnabledApiProposals?.length || !!manifest.enabledApiProposals?.length;
    }
    render(manifest) {
        const enabledApiProposals = manifest.originalEnabledApiProposals ?? manifest.enabledApiProposals ?? [];
        const data = new MarkdownString();
        if (enabledApiProposals.length) {
            for (const proposal of enabledApiProposals) {
                data.appendMarkdown(`- \`${proposal}\`\n`);
            }
        }
        return {
            data,
            dispose: () => { },
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'enabledApiProposals',
    label: localize('enabledProposedAPIs', 'API Proposals'),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(ApiProposalsMarkdowneRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb3Bvc2VkQXBpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnNQcm9wb3NlZEFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUNOLGVBQWUsR0FFZixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM3RixPQUFPLEVBQ04sVUFBVSxHQUlWLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUdqRixJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUtqQyxZQUMrQixXQUF3QixFQUVyQyxtQkFBaUQsRUFDakQsY0FBK0I7UUFIbEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFFckMsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUE4QjtRQUdsRSxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxHQUFHLENBQ25DLENBQUMsbUJBQW1CLENBQUMsMkJBQTJCLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FDbEUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUM3QixDQUNELENBQUE7UUFFRCxJQUFJLENBQUMsNEJBQTRCO1lBQ2hDLENBQUMsbUJBQW1CLENBQUMsT0FBTyxJQUFJLHdEQUF3RDtnQkFDeEYsQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsSUFBSSxjQUFjLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxJQUFJLCtFQUErRTtnQkFDdEssQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUM7b0JBQ3JDLEtBQUssQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBLENBQUMsc0ZBQXNGO1FBRXhKLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQTtRQUVyRSw0RUFBNEU7UUFDNUUsSUFBSSxjQUFjLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNqRCxLQUFLLE1BQU0sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDO2dCQUN0RixNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3hDLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxDQUFDLGVBQWUsQ0FBa0IsSUFBSSxDQUFDLEVBQUUsQ0FBQzt3QkFDN0MsV0FBVyxDQUFDLElBQUksQ0FDZiw4REFBOEQsR0FBRyx5QkFBeUIsSUFBSSxxSEFBcUgsQ0FDbk4sQ0FBQTt3QkFDRCxPQUFPLEtBQUssQ0FBQTtvQkFDYixDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFBO2dCQUNaLENBQUMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFBO1lBQ3ZELENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHlCQUF5QixDQUFDLFVBQW1DO1FBQzVELEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVDLENBQUM7SUFDRixDQUFDO0lBRU8sMkJBQTJCLENBQUMsU0FBeUM7UUFDNUUsTUFBTSxHQUFHLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUzRCw0REFBNEQ7UUFDNUQsSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUNwRCxTQUFTLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUM3RSxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFrQixJQUFJLENBQUMsQ0FBQyxDQUFBO2dCQUM5RCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQ3JCLGNBQWMsR0FBRyx5QkFBeUIsSUFBSSxxSEFBcUgsQ0FDbkssQ0FBQTtnQkFDRixDQUFDO2dCQUNELE9BQU8sTUFBTSxDQUFBO1lBQ2QsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0MscUdBQXFHO1lBQ3JHLDhHQUE4RztZQUM5Ryw0Q0FBNEM7WUFFNUMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBRSxDQUFBO1lBRXhFLHFGQUFxRjtZQUNyRixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQ25ELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1lBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDekUsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FDckIsY0FBYyxHQUFHLDZHQUE2RyxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUNoTixDQUFBO2dCQUVELElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLHNCQUFzQixFQUFFLENBQUM7b0JBQ3JELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUNyQixvQ0FBb0MsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsa0hBQWtILENBQzFLLENBQUE7b0JBQ0QsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1lBRUQsU0FBUyxDQUFDLG1CQUFtQixHQUFHLHVCQUF1QixDQUFBO1lBQ3ZELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsNEJBQTRCLElBQUksSUFBSSxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzlFLDJFQUEyRTtZQUMzRSxrQkFBa0I7WUFDbEIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsSUFBSSxlQUFlLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUM1RSwrRkFBK0Y7WUFDL0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQ3JCLGNBQWMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLLG9DQUFvQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsb0dBQW9HLENBQ2hPLENBQUE7WUFDRCxTQUFTLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTNHWSxxQkFBcUI7SUFNL0IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEsZUFBZSxDQUFBO0dBVEwscUJBQXFCLENBMkdqQzs7QUFFRCxNQUFNLDZCQUNMLFNBQVEsVUFBVTtJQURuQjs7UUFJVSxTQUFJLEdBQUcsVUFBVSxDQUFBO0lBb0IzQixDQUFDO0lBbEJBLFlBQVksQ0FBQyxRQUE0QjtRQUN4QyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsMkJBQTJCLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFBO0lBQ2hHLENBQUM7SUFFRCxNQUFNLENBQUMsUUFBNEI7UUFDbEMsTUFBTSxtQkFBbUIsR0FDeEIsUUFBUSxDQUFDLDJCQUEyQixJQUFJLFFBQVEsQ0FBQyxtQkFBbUIsSUFBSSxFQUFFLENBQUE7UUFDM0UsTUFBTSxJQUFJLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLEtBQUssTUFBTSxRQUFRLElBQUksbUJBQW1CLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLFFBQVEsTUFBTSxDQUFDLENBQUE7WUFDM0MsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPO1lBQ04sSUFBSTtZQUNKLE9BQU8sRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO1NBQ2pCLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLFVBQVUsQ0FBQyx5QkFBeUIsQ0FDcEMsQ0FBQyx3QkFBd0IsQ0FBQztJQUMxQixFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLEtBQUssRUFBRSxRQUFRLENBQUMscUJBQXFCLEVBQUUsZUFBZSxDQUFDO0lBQ3ZELE1BQU0sRUFBRTtRQUNQLFNBQVMsRUFBRSxLQUFLO0tBQ2hCO0lBQ0QsUUFBUSxFQUFFLElBQUksY0FBYyxDQUFDLDZCQUE2QixDQUFDO0NBQzNELENBQUMsQ0FBQSJ9