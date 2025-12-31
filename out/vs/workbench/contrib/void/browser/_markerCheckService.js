/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import * as dom from '../../../../base/browser/dom.js';
export const IMarkerCheckService = createDecorator('markerCheckService');
let MarkerCheckService = class MarkerCheckService extends Disposable {
    constructor(_markerService, _languageFeaturesService, _textModelService) {
        super();
        this._markerService = _markerService;
        this._languageFeaturesService = _languageFeaturesService;
        this._textModelService = _textModelService;
        const check = async () => {
            const allMarkers = this._markerService.read();
            const errors = allMarkers.filter((marker) => marker.severity === MarkerSeverity.Error);
            if (errors.length > 0) {
                for (const error of errors) {
                    console.log(`----------------------------------------------`);
                    console.log(`${error.resource.fsPath}: ${error.startLineNumber} ${error.message} ${error.severity}`); // ! all errors in the file
                    try {
                        // Get the text model for the file
                        const modelReference = await this._textModelService.createModelReference(error.resource);
                        const model = modelReference.object.textEditorModel;
                        // Create a range from the marker
                        const range = new Range(error.startLineNumber, error.startColumn, error.endLineNumber, error.endColumn);
                        // Get code action providers for this model
                        const codeActionProvider = this._languageFeaturesService.codeActionProvider;
                        const providers = codeActionProvider.ordered(model);
                        if (providers.length > 0) {
                            // Request code actions from each provider
                            for (const provider of providers) {
                                const context = {
                                    trigger: 1 /* CodeActionTriggerType.Invoke */, // keeping 'trigger' since it works
                                    only: 'quickfix', // adding this to filter for quick fixes
                                };
                                const actions = await provider.provideCodeActions(model, range, context, CancellationToken.None);
                                if (actions?.actions?.length) {
                                    const quickFixes = actions.actions.filter((action) => action.isPreferred); // ! all quickFixes for the error
                                    // const quickFixesForImports = actions.actions.filter(action => action.isPreferred && action.title.includes('import'));  // ! all possible imports
                                    // quickFixesForImports
                                    if (quickFixes.length > 0) {
                                        console.log('Available Quick Fixes:');
                                        quickFixes.forEach((action) => {
                                            console.log(`- ${action.title}`);
                                        });
                                    }
                                }
                            }
                        }
                        // Dispose the model reference
                        modelReference.dispose();
                    }
                    catch (e) {
                        console.error('Error getting quick fixes:', e);
                    }
                }
            }
        };
        const { window } = dom.getActiveWindow();
        window.setInterval(check, 5000);
    }
    fixErrorsInFiles(uris, contextSoFar) {
        // const allMarkers = this._markerService.read();
        // check errors in files
        // give LLM errors in files
    }
};
MarkerCheckService = __decorate([
    __param(0, IMarkerService),
    __param(1, ILanguageFeaturesService),
    __param(2, ITextModelService)
], MarkerCheckService);
registerSingleton(IMarkerCheckService, MarkerCheckService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX21hcmtlckNoZWNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9fbWFya2VyQ2hlY2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFNdEQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFBO0FBRTdGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUcxQyxZQUNrQyxjQUE4QixFQUNwQix3QkFBa0QsRUFDekQsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFBO1FBSjBCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUNwQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBQ3pELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFHeEUsTUFBTSxL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