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
var DebugContentProvider_1;
import { localize } from '../../../../nls.js';
import { getMimeTypes } from '../../../../editor/common/services/languagesAssociations.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { DEBUG_SCHEME, IDebugService } from './debug.js';
import { Source } from './debugSource.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../editor/common/languages/modesRegistry.js';
import { ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
/**
 * Debug URI format
 *
 * a debug URI represents a Source object and the debug session where the Source comes from.
 *
 *       debug:arbitrary_path?session=123e4567-e89b-12d3-a456-426655440000&ref=1016
 *       \___/ \____________/ \__________________________________________/ \______/
 *         |          |                             |                          |
 *      scheme   source.path                    session id            source.reference
 *
 * the arbitrary_path and the session id are encoded with 'encodeURIComponent'
 *
 */
let DebugContentProvider = class DebugContentProvider extends Disposable {
    static { DebugContentProvider_1 = this; }
    constructor(textModelResolverService, debugService, modelService, languageService, editorWorkerService) {
        super();
        this.debugService = debugService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.editorWorkerService = editorWorkerService;
        this.pendingUpdates = new Map();
        this._store.add(textModelResolverService.registerTextModelContentProvider(DEBUG_SCHEME, this));
        DebugContentProvider_1.INSTANCE = this;
    }
    dispose() {
        this.pendingUpdates.forEach((cancellationSource) => cancellationSource.dispose());
        super.dispose();
    }
    provideTextContent(resource) {
        return this.createOrUpdateContentModel(resource, true);
    }
    /**
     * Reload the model content of the given resource.
     * If there is no model for the given resource, this method does nothing.
     */
    static refreshDebugContent(resource) {
        DebugContentProvider_1.INSTANCE?.createOrUpdateContentModel(resource, false);
    }
    /**
     * Create or reload the model content of the given resource.
     */
    createOrUpdateContentModel(resource, createIfNotExists) {
        const model = this.modelService.getModel(resource);
        if (!model && !createIfNotExists) {
            // nothing to do
            return null;
        }
        let session;
        if (resource.query) {
            const data = Source.getEncodedDebugData(resource);
            session = this.debugService.getModel().getSession(data.sessionId);
        }
        if (!session) {
            // fallback: use focused session
            session = this.debugService.getViewModel().focusedSession;
        }
        if (!session) {
            return Promise.reject(new ErrorNoTelemetry(localize('unable', 'Unable to resolve the resource without a debug session')));
        }
        const createErrModel = (errMsg) => {
            this.debugService.sourceIsNotAvailable(resource);
            const languageSelection = this.languageService.createById(PLAINTEXT_LANGUAGE_ID);
            const message = errMsg
                ? localize('canNotResolveSourceWithError', "Could not load source '{0}': {1}.", resource.path, errMsg)
                : localize('canNotResolveSource', "Could not load source '{0}'.", resource.path);
            return this.modelService.createModel(message, languageSelection, resource);
        };
        return session.loadSource(resource).then((response) => {
            if (response && response.body) {
                if (model) {
                    const newContent = response.body.content;
                    // cancel and dispose an existing update
                    const cancellationSource = this.pendingUpdates.get(model.id);
                    cancellationSource?.cancel();
                    // create and keep update token
                    const myToken = new CancellationTokenSource();
                    this.pendingUpdates.set(model.id, myToken);
                    // update text model
                    return this.editorWorkerService
                        .computeMoreMinimalEdits(model.uri, [
                        { text: newContent, range: model.getFullModelRange() },
                    ])
                        .then((edits) => {
                        // remove token
                        this.pendingUpdates.delete(model.id);
                        if (!myToken.token.isCancellationRequested && edits && edits.length > 0) {
                            // use the evil-edit as these models show in readonly-editor only
                            model.applyEdits(edits.map((edit) => EditOperation.replace(Range.lift(edit.range), edit.text)));
                        }
                        return model;
                    });
                }
                else {
                    // create text model
                    const mime = response.body.mimeType || getMimeTypes(resource)[0];
                    const languageSelection = this.languageService.createByMimeType(mime);
                    return this.modelService.createModel(response.body.content, languageSelection, resource);
                }
            }
            return createErrModel();
        }, (err) => createErrModel(err.message));
    }
};
DebugContentProvider = DebugContentProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IDebugService),
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IEditorWorkerService)
], DebugContentProvider);
export { DebugContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBaUIsTUFBTSxZQUFZLENBQUE7QUFDdkUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFOzs7Ozs7Ozs7Ozs7R0FZRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0s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