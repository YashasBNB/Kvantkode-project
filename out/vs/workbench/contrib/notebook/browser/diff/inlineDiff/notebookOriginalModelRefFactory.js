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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPcmlnaW5hbE1vZGVsUmVmRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9pbmxpbmVEaWZmL25vdGVib29rT3JpZ2luYWxNb2RlbFJlZkZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHdCQUF3QixFQUV4QixtQkFBbUIsR0FDbkIsTUFBTSw0Q0FBNEMsQ0FBQTtBQUVuRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWxGLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFFL0YsTUFBTSxDQUFDLE1BQU0sc0NBQXNDLEdBQ2xELGVBQWUsQ0FBeUMsd0NBQXdDLENBQUMsQ0FBQTtBQVUzRixJQUFNLHdDQUF3QyxHQUE5QyxNQUFNLHdDQUF5QyxTQUFRLG1CQUU3RDtJQUVBLFlBQ21CLGVBQWtELEVBQ2pELFlBQWdEO1FBRW5FLEtBQUssRUFBRSxDQUFBO1FBSDRCLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNoQyxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFIbkQsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBTXBELENBQUM7SUFFa0IsS0FBSyxDQUFDLHNCQUFzQixDQUM5QyxHQUFXLEVBQ1gsU0FBNkIsRUFDN0IsUUFBZ0I7UUFFaEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFD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