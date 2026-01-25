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
var DefaultFoldingRangeProvider_1;
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import * as nls from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let DefaultFoldingRangeProvider = class DefaultFoldingRangeProvider extends Disposable {
    static { DefaultFoldingRangeProvider_1 = this; }
    static { this.configName = 'editor.defaultFoldingRangeProvider'; }
    static { this.extensionIds = []; }
    static { this.extensionItemLabels = []; }
    static { this.extensionDescriptions = []; }
    constructor(_extensionService, _configurationService) {
        super();
        this._extensionService = _extensionService;
        this._configurationService = _configurationService;
        this._store.add(this._extensionService.onDidChangeExtensions(this._updateConfigValues, this));
        this._store.add(FoldingController.setFoldingRangeProviderSelector(this._selectFoldingRangeProvider.bind(this)));
        this._updateConfigValues();
    }
    async _updateConfigValues() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        DefaultFoldingRangeProvider_1.extensionIds.length = 0;
        DefaultFoldingRangeProvider_1.extensionItemLabels.length = 0;
        DefaultFoldingRangeProvider_1.extensionDescriptions.length = 0;
        DefaultFoldingRangeProvider_1.extensionIds.push(null);
        DefaultFoldingRangeProvider_1.extensionItemLabels.push(nls.localize('null', 'All'));
        DefaultFoldingRangeProvider_1.extensionDescriptions.push(nls.localize('nullFormatterDescription', 'All active folding range providers'));
        const languageExtensions = [];
        const otherExtensions = [];
        for (const extension of this._extensionService.extensions) {
            if (extension.main || extension.browser) {
                if (extension.categories?.find((cat) => cat === 'Programming Languages')) {
                    languageExtensions.push(extension);
                }
                else {
                    otherExtensions.push(extension);
                }
            }
        }
        const sorter = (a, b) => a.name.localeCompare(b.name);
        for (const extension of languageExtensions.sort(sorter)) {
            DefaultFoldingRangeProvider_1.extensionIds.push(extension.identifier.value);
            DefaultFoldingRangeProvider_1.extensionItemLabels.push(extension.displayName ?? '');
            DefaultFoldingRangeProvider_1.extensionDescriptions.push(extension.description ?? '');
        }
        for (const extension of otherExtensions.sort(sorter)) {
            DefaultFoldingRangeProvider_1.extensionIds.push(extension.identifier.value);
            DefaultFoldingRangeProvider_1.extensionItemLabels.push(extension.displayName ?? '');
            DefaultFoldingRangeProvider_1.extensionDescriptions.push(extension.description ?? '');
        }
    }
    _selectFoldingRangeProvider(providers, document) {
        const value = this._configurationService.getValue(DefaultFoldingRangeProvider_1.configName, { overrideIdentifier: document.getLanguageId() });
        if (value) {
            return providers.filter((p) => p.id === value);
        }
        return undefined;
    }
};
DefaultFoldingRangeProvider = DefaultFoldingRangeProvider_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService)
], DefaultFoldingRangeProvider);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        [DefaultFoldingRangeProvider.configName]: {
            description: nls.localize('formatter.default', 'Defines a default folding range provider that takes precedence over all other folding range providers. Must be the identifier of an extension contributing a folding range provider.'),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFoldingRangeProvider.extensionIds,
            enumItemLabels: DefaultFoldingRangeProvider.extensionItemLabels,
            markdownEnumDescriptions: DefaultFoldingRangeProvider.extensionDescriptions,
        },
    },
});
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DefaultFoldingRangeProvider, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9mb2xkaW5nLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBR2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FDckMsTUFBTSxvRUFBb0UsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUUzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUdyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUE0QixTQUFRLFVBQVU7O2FBQ25DLGVBQVUsR0FBRyxvQ0FBb0MsQUFBdkMsQ0FBdUM7YUFFMUQsaUJBQVksR0FBc0IsRUFBRSxBQUF4QixDQUF3QjthQUNwQyx3QkFBbUIsR0FBYSxFQUFFLEFBQWYsQ0FBZTthQUNsQywwQkFBcUIsR0FBYSxFQUFFLEFBQWYsQ0FBZTtJQUUzQyxZQUNxQyxpQkFBb0MsRUFDaEMscUJBQTRDO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSDZCLHNCQUFpQixH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