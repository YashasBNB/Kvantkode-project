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
import { localize } from '../../../../nls.js';
import { getLocation, parse } from '../../../../base/common/json.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
let ExtensionsCompletionItemsProvider = class ExtensionsCompletionItemsProvider extends Disposable {
    constructor(extensionManagementService, languageFeaturesService) {
        super();
        this.extensionManagementService = extensionManagementService;
        this._register(languageFeaturesService.completionProvider.register({ language: 'jsonc', pattern: '**/settings.json' }, {
            _debugDisplayName: 'extensionsCompletionProvider',
            provideCompletionItems: async (model, position, _context, token) => {
                const getWordRangeAtPosition = (model, position) => {
                    const wordAtPosition = model.getWordAtPosition(position);
                    return wordAtPosition
                        ? new Range(position.lineNumber, wordAtPosition.startColumn, position.lineNumber, wordAtPosition.endColumn)
                        : null;
                };
                const location = getLocation(model.getValue(), model.getOffsetAt(position));
                const range = getWordRangeAtPosition(model, position) ?? Range.fromPositions(position, position);
                // extensions.supportUntrustedWorkspaces
                if (location.path[0] === 'extensions.supportUntrustedWorkspaces' &&
                    location.path.length === 2 &&
                    location.isAtPropertyKey) {
                    let alreadyConfigured = [];
                    try {
                        alreadyConfigured = Object.keys(parse(model.getValue())['extensions.supportUntrustedWorkspaces']);
                    }
                    catch (e) {
                        /* ignore error */
                    }
                    return {
                        suggestions: await this.provideSupportUntrustedWorkspacesExtensionProposals(alreadyConfigured, range),
                    };
                }
                return { suggestions: [] };
            },
        }));
    }
    async provideSupportUntrustedWorkspacesExtensionProposals(alreadyConfigured, range) {
        const suggestions = [];
        const installedExtensions = (await this.extensionManagementService.getInstalled()).filter((e) => e.manifest.main);
        const proposedExtensions = installedExtensions.filter((e) => alreadyConfigured.indexOf(e.identifier.id) === -1);
        if (proposedExtensions.length) {
            suggestions.push(...proposedExtensions.map((e) => {
                const text = `"${e.identifier.id}": {\n\t"supported": true,\n\t"version": "${e.manifest.version}"\n},`;
                return {
                    label: e.identifier.id,
                    kind: 13 /* CompletionItemKind.Value */,
                    insertText: text,
                    filterText: text,
                    range,
                };
            }));
        }
        else {
            const text = '"vscode.csharp": {\n\t"supported": true,\n\t"version": "0.0.0"\n},';
            suggestions.push({
                label: localize('exampleExtension', 'Example'),
                kind: 13 /* CompletionItemKind.Value */,
                insertText: text,
                filterText: text,
                range,
            });
        }
        return suggestions;
    }
};
ExtensionsCompletionItemsProvider = __decorate([
    __param(0, IExtensionManagementService),
    __param(1, ILanguageFeaturesService)
], ExtensionsCompletionItemsProvider);
export { ExtensionsCompletionItemsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0NvbXBsZXRpb25JdGVtc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL2V4dGVuc2lvbnNDb21wbGV0aW9uSXRlbXNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFTakUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFFcEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRTFGLElBQU0saUNBQWlDLEdBQXZDLE1BQU0saUNBQ1osU0FBUSxVQUFVO0lBR2xCLFlBRWtCLDBCQUF1RCxFQUM5Qyx1QkFBaUQ7UUFFM0UsS0FBSyxFQUFFLENBQUE7UUFIVSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBS3hFLElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUNsRCxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLEVBQ2xEO1lBQ0MsaUJBQWlCLEVBQUUsOEJBQThCO1lBQ2pELHNCQUFzQixFQUFFLEtBQUssRUFDNUIsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsUUFBMkIsRUFDM0IsS0FBd0IsRUFDRSxFQUFFO2dCQUM1QixNQUFNLHNCQUFzQixHQUFH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