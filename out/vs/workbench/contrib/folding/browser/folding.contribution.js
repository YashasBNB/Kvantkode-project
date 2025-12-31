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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9sZGluZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9mb2xkaW5nL2Jyb3dzZXIvZm9sZGluZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUdqQyxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sb0VBQW9FLENBQUE7QUFDM0UsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVOzthQUNuQyxlQUFVLEdBQUcsb0NBQW9DLEFBQXZDLENBQXVDO2FBRTFELGlCQUFZLEdBQXNCLEVBQUUsQUFBeEIsQ0FBd0I7YUFDcEMsd0JBQW1CLEdBQWEsRUFBRSxBQUFmLENBQWU7YUFDbEMsMEJBQXFCLEdBQWEsRUFBRSxBQUFmLENBQWU7SUFFM0MsWUFDcUMsaUJBQW9DLEVBQ2hDLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUg2QixzQkFBaUIsR0FBakIs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