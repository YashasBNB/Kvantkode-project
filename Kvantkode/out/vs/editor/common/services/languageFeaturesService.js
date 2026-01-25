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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VGZWF0dXJlc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLHVCQUF1QixHQUd2QixNQUFNLCtCQUErQixDQUFBO0FBbUN0QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsTUFBTSxPQUFPLHVCQUF1QjtJQUFwQztRQUdVLHNCQUFpQixHQUFHLElBQUksdUJBQXVCLENBQ3ZELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN0QixDQUFBO1FBQ1EsbUJBQWMsR0FBRyxJQUFJLHVCQUF1QixDQUFpQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ3BGLDJCQUFzQixHQUFHLElBQUksdUJBQXVCLENBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN0QixDQUFBO1FBQ1EsdUJBQWtCLEdBQUcsSUFBSSx1QkFBdUIsQ0FDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQ3RCLENBQUE7UUFDUSx1QkFBa0IsR0FBRyxJQUFJLHVCQUF1QixDQUN4RCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQTtRQUNRLDJCQUFzQixHQUFHLElBQUksdUJBQXVCLENBQzVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUN0QixDQUFB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