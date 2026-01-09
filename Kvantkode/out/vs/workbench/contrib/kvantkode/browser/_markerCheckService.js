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
