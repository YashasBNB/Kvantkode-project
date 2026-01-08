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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc0NvbXBsZXRpb25JdGVtc1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uc0NvbXBsZXRpb25JdGVtc1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUVwSCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFMUYsSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FDWixTQUFRLFVBQVU7SUFHbEIsWUFFa0IsMEJBQXVELEVBQzlDLHVCQUFpRDtRQUUzRSxLQUFLLEVBQUUsQ0FBQTtRQUhVLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFLeEUsSUFBSSxDQUFDLFNBQVMsQ0FDYix1QkFBdUIsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQ2xELEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsRUFDbEQ7WUFDQyxpQkFBaUIsRUFBRSw4QkFBOEI7WUFDakQsc0JBQXNCLEVBQUUsS0FBSyxFQUM1QixLQUFpQixFQUNqQixRQUFrQixFQUNsQixRQUEyQixFQUMzQixLQUF3QixFQUNFLEVBQUU7Z0JBQzVCLE1BQU0sc0JBQXNC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