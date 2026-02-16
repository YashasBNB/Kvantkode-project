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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kZWJ1Z0NvbnRlbnRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUUxRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFpQixNQUFNLFlBQVksQ0FBQTtBQUN2RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDekMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakU7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0ksSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFDWixTQUFRLFVBQVU7O0lBT2xCLFlBQ29CLHdCQUEyQyxFQUMvQyxZQUE0QyxFQUM1QyxZQUE0QyxFQUN6QyxlQUFrRCxFQUM5QyxtQkFBMEQ7UUFFaEYsS0FBSyxFQUFFLENBQUE7UUFMeUIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDeEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQzdCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFQaEUsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQTtRQVUzRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUM5RixzQkFBb0IsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO0lBQ3JDLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNqRixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVELGtCQUFrQixDQUFDLFFBQWE7UUFDL0IsT0FBTyxJQUFJLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ3ZELENBQUM7SUFFRDs7O09BR0c7SUFDSCxNQUFNLENBQUMsbUJBQW1CLENBQUMsUUFBYTtRQUN2QyxzQkFBb0IsQ0FBQyxRQUFRLEVBQUUsMEJBQTBCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFRDs7T0FFRztJQUNLLDBCQUEwQixDQUNqQyxRQUFhLEVBQ2IsaUJBQTBCO1FBRTFCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ2xDLGdCQUFnQjtZQUNoQixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLE9BQWtDLENBQUE7UUFFdEMsSUFBSSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2pELE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLGdDQUFnQztZQUNoQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxjQUFjLENBQUE7UUFDMUQsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FDcEIsSUFBSSxnQkFBZ0IsQ0FDbkIsUUFBUSxDQUFDLFFBQVEsRUFBRSx3REFBd0QsQ0FBQyxDQUM1RSxDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFlLEVBQUUsRUFBRTtZQUMxQyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2hELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQTtZQUNoRixNQUFNLE9BQU8sR0FBRyxNQUFNO2dCQUNyQixDQUFDLENBQUMsUUFBUSxDQUNSLDhCQUE4QixFQUM5QixtQ0FBbUMsRUFDbkMsUUFBUSxDQUFDLElBQUksRUFDYixNQUFNLENBQ047Z0JBQ0YsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSw4QkFBOEIsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDakYsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDM0UsQ0FBQyxDQUFBO1FBRUQsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FDdkMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNaLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDWCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQTtvQkFFeEMsd0NBQXdDO29CQUN4QyxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtvQkFDNUQsa0JBQWtCLEVBQUUsTUFBTSxFQUFFLENBQUE7b0JBRTVCLCtCQUErQjtvQkFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO29CQUM3QyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUUxQyxvQkFBb0I7b0JBQ3BCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQjt5QkFDN0IsdUJBQXVCLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTt3QkFDbkMsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsaUJBQWlCLEVBQUUsRUFBRTtxQkFDdEQsQ0FBQzt5QkFDRCxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTt3QkFDZixlQUFlO3dCQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTt3QkFFcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7NEJBQ3pFLGlFQUFpRTs0QkFDakUsS0FBSyxDQUFDLFVBQVUsQ0FDZixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUM3RSxDQUFBO3dCQUNGLENBQUM7d0JBQ0QsT0FBTyxLQUFLLENBQUE7b0JBQ2IsQ0FBQyxDQUFDLENBQUE7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLG9CQUFvQjtvQkFDcEIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNoRSxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7b0JBQ3JFLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ3pGLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTyxjQUFjLEVBQUUsQ0FBQTtRQUN4QixDQUFDLEVBQ0QsQ0FBQyxHQUFnQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUNqRSxDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUEvSFksb0JBQW9CO0lBUzlCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxvQkFBb0IsQ0FBQTtHQWJWLG9CQUFvQixDQStIaEMifQ==