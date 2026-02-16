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
import { AsyncReferenceCollection, ReferenceCollection, } from '../../../../../../base/common/lifecycle.js';
import { INotebookService } from '../../../common/notebookService.js';
import { bufferToStream, VSBuffer } from '../../../../../../base/common/buffer.js';
import { createDecorator, IInstantiationService, } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
export const INotebookOriginalModelReferenceFactory = createDecorator('INotebookOriginalModelReferenceFactory');
let OriginalNotebookModelReferenceCollection = class OriginalNotebookModelReferenceCollection extends ReferenceCollection {
    constructor(notebookService, modelService) {
        super();
        this.notebookService = notebookService;
        this.modelService = modelService;
        this.modelsToDispose = new Set();
    }
    async createReferencedObject(key, fileEntry, viewType) {
        this.modelsToDispose.delete(key);
        const uri = fileEntry.originalURI;
        const model = this.notebookService.getNotebookTextModel(uri);
        if (model) {
            return model;
        }
        const modelRef = await this.modelService.createModelReference(uri);
        const bytes = VSBuffer.fromString(modelRef.object.textEditorModel.getValue());
        const stream = bufferToStream(bytes);
        modelRef.dispose();
        return this.notebookService.createNotebookTextModel(viewType, uri, stream);
    }
    destroyReferencedObject(key, modelPromise) {
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await modelPromise;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                model.dispose();
            }
            catch (error) {
                // ignore
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
};
OriginalNotebookModelReferenceCollection = __decorate([
    __param(0, INotebookService),
    __param(1, ITextModelService)
], OriginalNotebookModelReferenceCollection);
export { OriginalNotebookModelReferenceCollection };
let NotebookOriginalModelReferenceFactory = class NotebookOriginalModelReferenceFactory {
    get resourceModelCollection() {
        if (!this._resourceModelCollection) {
            this._resourceModelCollection = this.instantiationService.createInstance(OriginalNotebookModelReferenceCollection);
        }
        return this._resourceModelCollection;
    }
    get asyncModelCollection() {
        if (!this._asyncModelCollection) {
            this._asyncModelCollection = new AsyncReferenceCollection(this.resourceModelCollection);
        }
        return this._asyncModelCollection;
    }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this._resourceModelCollection = undefined;
        this._asyncModelCollection = undefined;
    }
    getOrCreate(fileEntry, viewType) {
        return this.asyncModelCollection.acquire(fileEntry.originalURI.toString(), fileEntry, viewType);
    }
};
NotebookOriginalModelReferenceFactory = __decorate([
    __param(0, IInstantiationService)
], NotebookOriginalModelReferenceFactory);
export { NotebookOriginalModelReferenceFactory };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbE1vZGVsUmVmRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tPcmlnaW5hbE1vZGVsUmVmRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sd0JBQXdCLEVBRXhCLG1CQUFtQixHQUNuQixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFbEYsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUUvRixNQUFNLENBQUMsTUFBTSxzQ0FBc0MsR0FDbEQsZUFBZSxDQUF5Qyx3Q0FBd0MsQ0FBQyxDQUFBO0FBVTNGLElBQU0sd0NBQXdDLEdBQTlDLE1BQU0sd0NBQXlDLFNBQVEsbUJBRTdEO0lBRUEsWUFDbUIsZUFBa0QsRUFDakQsWUFBZ0Q7UUFFbkUsS0FBSyxFQUFFLENBQUE7UUFINEIsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ2hDLGlCQUFZLEdBQVosWUFBWSxDQUFtQjtRQUhuRCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFNcEQsQ0FBQztJQUVrQixLQUFLLENBQUMsc0JBQXNCLENBQzlDLEdBQVcsRUFDWCxTQUE2QixFQUM3QixRQUFnQjtRQUVoQixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0s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