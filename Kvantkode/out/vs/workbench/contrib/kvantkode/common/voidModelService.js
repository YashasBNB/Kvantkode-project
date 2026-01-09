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
