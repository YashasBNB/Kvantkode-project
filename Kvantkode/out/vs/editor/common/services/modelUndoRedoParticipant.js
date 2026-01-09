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
import { IModelService } from './model.js';
import { ITextModelService } from './resolverService.js';
import { Disposable, dispose } from '../../../base/common/lifecycle.js';
import { IUndoRedoService } from '../../../platform/undoRedo/common/undoRedo.js';
import { MultiModelEditStackElement } from '../model/editStack.js';
let ModelUndoRedoParticipant = class ModelUndoRedoParticipant extends Disposable {
    constructor(_modelService, _textModelService, _undoRedoService) {
        super();
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._undoRedoService = _undoRedoService;
        this._register(this._modelService.onModelRemoved((model) => {
            // a model will get disposed, so let's check if the undo redo stack is maintained
            const elements = this._undoRedoService.getElements(model.uri);
            if (elements.past.length === 0 && elements.future.length === 0) {
                return;
            }
            for (const element of elements.past) {
                if (element instanceof MultiModelEditStackElement) {
                    element.setDelegate(this);
                }
            }
            for (const element of elements.future) {
                if (element instanceof MultiModelEditStackElement) {
                    element.setDelegate(this);
                }
            }
        }));
    }
    prepareUndoRedo(element) {
        // Load all the needed text models
        const missingModels = element.getMissingModels();
        if (missingModels.length === 0) {
            // All models are available!
            return Disposable.None;
        }
        const disposablesPromises = missingModels.map(async (uri) => {
            try {
                const reference = await this._textModelService.createModelReference(uri);
                return reference;
            }
            catch (err) {
                // This model could not be loaded, maybe it was deleted in the meantime?
                return Disposable.None;
            }
        });
        return Promise.all(disposablesPromises).then((disposables) => {
            return {
                dispose: () => dispose(disposables),
            };
        });
    }
};
ModelUndoRedoParticipant = __decorate([
    __param(0, IModelService),
    __param(1, ITextModelService),
    __param(2, IUndoRedoService)
], ModelUndoRedoParticipant);
export { ModelUndoRedoParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxVbmRvUmVkb1BhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL21vZGVsVW5kb1JlZG9QYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQWUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDaEYsT0FBTyxFQUFxQiwwQkFBMEIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTlFLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQUN2RCxZQUNpQyxhQUE0QixFQUN4QixpQkFBb0MsRUFDckMsZ0JBQWtDO1FBRXJFLEtBQUssRUFBRSxDQUFBO1FBSnlCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3hCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDckMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUdyRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDM0MsaUZBQWlGO1lBQ2pGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdELElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoRSxPQUFNO1lBQ1AsQ0FBQztZQUNELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNyQyxJQUFJLE9BQU8sWUFBWSwwQkFBMEIsRUFBRSxDQUFDO29CQUNuRCxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztZQUNELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2QyxJQUFJLE9BQU8sWUFBWSwwQkFBMEIsRUFBRSxDQUFDO29CQUNuRCxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU0sZUFBZSxDQUFDLE9BQW1DO1FBQ3pELGtDQUFrQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUNoRCxJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsNEJBQTRCO1lBQzVCLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtRQUN2QixDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUMzRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQ3hFLE9BQW9CLFNBQVMsQ0FBQTtZQUM5QixDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCx3RUFBd0U7Z0JBQ3hFLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUM1RCxPQUFPO2dCQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO2FBQ25DLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBcERZLHdCQUF3QjtJQUVsQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLHdCQUF3QixDQW9EcEMifQ==