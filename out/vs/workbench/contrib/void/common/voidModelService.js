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
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
export const IVoidModelService = createDecorator('voidVoidModelService');
let VoidModelService = class VoidModelService extends Disposable {
    static { this.ID = 'voidVoidModelService'; }
    constructor(_textModelService, _textFileService) {
        super();
        this._textModelService = _textModelService;
        this._textFileService = _textFileService;
        this._modelRefOfURI = {};
        this.saveModel = async (uri) => {
            await this._textFileService.save(uri, {
                // we want [our change] -> [save] so it's all treated as one change.
                skipSaveParticipants: true, // avoid triggering extensions etc (if they reformat the page, it will add another item to the undo stack)
            });
        };
        this.initializeModel = async (uri) => {
            try {
                if (uri.fsPath in this._modelRefOfURI)
                    return;
                const editorModelRef = await this._textModelService.createModelReference(uri);
                // Keep a strong reference to prevent disposal
                this._modelRefOfURI[uri.fsPath] = editorModelRef;
            }
            catch (e) {
                console.log('InitializeModel error:', e);
            }
        };
        this.getModelFromFsPath = (fsPath) => {
            const editorModelRef = this._modelRefOfURI[fsPath];
            if (!editorModelRef) {
                return { model: null, editorModel: null };
            }
            const model = editorModelRef.object.textEditorModel;
            if (!model) {
                return { model: null, editorModel: editorModelRef.object };
            }
            return { model, editorModel: editorModelRef.object };
        };
        this.getModel = (uri) => {
            return this.getModelFromFsPath(uri.fsPath);
        };
        this.getModelSafe = async (uri) => {
            if (!(uri.fsPath in this._modelRefOfURI))
                await this.initializeModel(uri);
            return this.getModel(uri);
        };
    }
    dispose() {
        super.dispose();
        for (const ref of Object.values(this._modelRefOfURI)) {
            ref.dispose(); // release reference to allow disposal
        }
    }
};
VoidModelService = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService)
], VoidModelService);
registerSingleton(IVoidModelService, VoidModelService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZE1vZGVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvY29tbW9uL3ZvaWRNb2RlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBRzdFLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBZ0JqRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLHNCQUFzQixDQUFDLENBQUE7QUFFM0YsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVO2FBRXhCLE9BQUUsR0FBRyxzQkFBc0IsQUFBekIsQ0FBeUI7SUFHM0MsWUFDb0IsaUJBQXFELEVBQ3RELGdCQUFtRDtRQUVyRSxLQUFLLEVBQUUsQ0FBQTtRQUg2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ3JDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFKckQsbUJBQWMsR0FBeUQsRUFBRSxDQUFBO1FBUzFGLGNBQVMsR0FBRyxLQUFLLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUIsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDckMsb0VBQW9FO2dCQUNwRSxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsMEdBQTBHO2FBQ3RJLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQTtRQUVELG9CQUFlLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3BDLElBQUksQ0FBQztnQkFDSixJQUFJLEdBQUcsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLGNBQWM7b0JBQUUsT0FBTTtnQkFDN0MsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzdFLDhDQUE4QztnQkFDOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsY0FBYyxDQUFBO1lBQ2pELENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUMsQ0FBQTtRQUVELHVCQUFrQixHQUFHLENBQUMsTUFBYyxFQUFpQixFQUFFO1lBQ3RELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUE7WUFDbEQsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNyQixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDMUMsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO1lBRW5ELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxDQUFBO1lBQzNELENBQUM7WUFFRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDckQsQ0FBQyxDQUFBO1FBRUQsYUFBUSxHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDdkIsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNDLENBQUMsQ0FBQTtRQUVELGlCQUFZLEdBQUcsS0FBSyxFQUFFLEdBQVEsRUFBMEIsRUFBRTtZQUN6RCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUM7Z0JBQUUsTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3pFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxQixDQUFDLENBQUE7SUExQ0QsQ0FBQztJQTRDUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ3RELEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQSxDQUFDLHNDQUFzQztRQUNyRCxDQUFDO0lBQ0YsQ0FBQzs7QUEzREksZ0JBQWdCO0lBTW5CLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtHQVBiLGdCQUFnQixDQTREckI7QUFFRCxpQkFBaUIsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0Isa0NBQTBCLENBQUEifQ==