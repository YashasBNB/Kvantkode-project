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
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { getEditorFeatures } from '../../../../editor/common/editorFeatures.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
let EditorFeaturesInstantiator = class EditorFeaturesInstantiator extends Disposable {
    static { this.ID = 'workbench.contrib.editorFeaturesInstantiator'; }
    constructor(codeEditorService, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._instantiated = false;
        this._register(codeEditorService.onWillCreateCodeEditor(() => this._instantiate()));
        this._register(codeEditorService.onWillCreateDiffEditor(() => this._instantiate()));
        if (codeEditorService.listCodeEditors().length > 0 ||
            codeEditorService.listDiffEditors().length > 0) {
            this._instantiate();
        }
    }
    _instantiate() {
        if (this._instantiated) {
            return;
        }
        this._instantiated = true;
        // Instantiate all editor features
        const editorFeatures = getEditorFeatures();
        for (const feature of editorFeatures) {
            try {
                const instance = this._instantiationService.createInstance(feature);
                if (typeof instance.dispose === 'function') {
                    this._register(instance);
                }
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
    }
};
EditorFeaturesInstantiator = __decorate([
    __param(0, ICodeEditorService),
    __param(1, IInstantiationService)
], EditorFeaturesInstantiator);
registerWorkbenchContribution2(EditorFeaturesInstantiator.ID, EditorFeaturesInstantiator, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRmVhdHVyZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9lZGl0b3JGZWF0dXJlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTthQUNsQyxPQUFFLEdBQUcsOENBQThDLEFBQWpELENBQWlEO0lBSW5FLFlBQ3FCLGlCQUFxQyxFQUNsQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFGaUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUo3RSxrQkFBYSxHQUFHLEtBQUssQ0FBQTtRQVE1QixJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25GLElBQ0MsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUM7WUFDOUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsRUFDN0MsQ0FBQztZQUNGLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNwQixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVk7UUFDbkIsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQTtRQUV6QixrQ0FBa0M7UUFDbEMsTUFBTSxjQUFjLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtRQUMxQyxLQUFLLE1BQU0sT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQztnQkFDSixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUNuRSxJQUFJLE9BQXFCLFFBQVMsQ0FBQyxPQUFPLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQzNELElBQUksQ0FBQyxTQUFTLENBQWMsUUFBUSxDQUFDLENBQUE7Z0JBQ3RDLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBdkNJLDBCQUEwQjtJQU03QixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FQbEIsMEJBQTBCLENBd0MvQjtBQUVELDhCQUE4QixDQUM3QiwwQkFBMEIsQ0FBQyxFQUFFLEVBQzdCLDBCQUEwQixzQ0FFMUIsQ0FBQSJ9