/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageFeatureRegistry, } from '../languageFeatureRegistry.js';
import { ILanguageFeaturesService } from './languageFeatures.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
export class LanguageFeaturesService {
    constructor() {
        this.referenceProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.renameProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.newSymbolNamesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeActionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.definitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.typeDefinitionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.declarationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.implementationProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSymbolProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlayHintsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.colorProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.codeLensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.onTypeFormattingEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.signatureHelpProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.hoverProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.multiDocumentHighlightProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.selectionRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.foldingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineCompletionsProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.completionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.linkedEditingRangeProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.inlineValuesProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.evaluatableExpressionProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentRangeSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentSemanticTokensProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentDropEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
        this.documentPasteEditProvider = new LanguageFeatureRegistry(this._score.bind(this));
    }
    setNotebookTypeResolver(resolver) {
        this._notebookTypeResolver = resolver;
    }
    _score(uri) {
        return this._notebookTypeResolver?.(uri);
    }
}
registerSingleton(ILanguageFeaturesService, LanguageFeaturesService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL2xhbmd1YWdlRmVhdHVyZXNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTix1QkFBdUIsR0FHdkIsTUFBTSwrQkFBK0IsQ0FBQTtBQW1DdEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELE1BQU0sT0FBTyx1QkFBdUI7SUFBcEM7UUFHVSxzQkFBaUIsR0FBRyxJQUFJLHVCQUF1QixDQUN2RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQTtRQUNRLG1CQUFjLEdBQUcsSUFBSSx1QkFBdUIsQ0FBaUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNwRiwyQkFBc0IsR0FBRyxJQUFJLHVCQUF1QixDQUM1RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQTtRQUNRLHVCQUFrQixHQUFHLElBQUksdUJBQXVCLENBQ3hELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN0QixDQUFBO1FBQ1EsdUJBQWtCLEdBQUcsSUFBSSx1QkFBdUIsQ0FDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ3RCLENBQUE7UUFDUSwyQkFBc0IsR0FBRyxJQUFJLHVCQUF1QixDQUM1RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQTtRQUNR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