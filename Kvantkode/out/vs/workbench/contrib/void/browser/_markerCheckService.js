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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiX21hcmtlckNoZWNrU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL19tYXJrZXJDaGVja1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHM0UsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQU10RCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUFFN0YsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBRzFDLFlBQ2tDLGNBQThCLEVBQ3BCLHdCQUFrRCxFQUN6RCxpQkFBb0M7UUFFeEUsS0FBSyxFQUFFLENBQUE7UUFKMEIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3BCLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDekQsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUd4RSxN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