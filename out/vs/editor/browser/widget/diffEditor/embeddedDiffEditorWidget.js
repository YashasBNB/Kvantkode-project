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
import * as objects from '../../../../base/common/objects.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { DiffEditorWidget } from './diffEditorWidget.js';
import { IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorProgressService } from '../../../../platform/progress/common/progress.js';
let EmbeddedDiffEditorWidget = class EmbeddedDiffEditorWidget extends DiffEditorWidget {
    constructor(domElement, options, codeEditorWidgetOptions, parentEditor, contextKeyService, instantiationService, codeEditorService, accessibilitySignalService, editorProgressService) {
        super(domElement, parentEditor.getRawOptions(), codeEditorWidgetOptions, contextKeyService, instantiationService, codeEditorService, accessibilitySignalService, editorProgressService);
        this._parentEditor = parentEditor;
        this._overwriteOptions = options;
        // Overwrite parent's options
        super.updateOptions(this._overwriteOptions);
        this._register(parentEditor.onDidChangeConfiguration((e) => this._onParentConfigurationChanged(e)));
    }
    getParentEditor() {
        return this._parentEditor;
    }
    _onParentConfigurationChanged(e) {
        super.updateOptions(this._parentEditor.getRawOptions());
        super.updateOptions(this._overwriteOptions);
    }
    updateOptions(newOptions) {
        objects.mixin(this._overwriteOptions, newOptions, true);
        super.updateOptions(this._overwriteOptions);
    }
};
EmbeddedDiffEditorWidget = __decorate([
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, ICodeEditorService),
    __param(7, IAccessibilitySignalService),
    __param(8, IEditorProgressService)
], EmbeddedDiffEditorWidget);
export { EmbeddedDiffEditorWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZWREaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvZW1iZWRkZWREaWZmRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUFnQyxNQUFNLHVCQUF1QixDQUFBO0FBTXRGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGdGQUFnRixDQUFBO0FBQzVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsZ0JBQWdCO0lBSTdELFlBQ0MsVUFBdUIsRUFDdkIsT0FBaUQsRUFDakQsdUJBQXFELEVBQ3JELFlBQXlCLEVBQ0wsaUJBQXFDLEVBQ2xDLG9CQUEyQyxFQUM5QyxpQkFBcUMsRUFDNUIsMEJBQXVELEVBQzVELHFCQUE2QztRQUVyRSxLQUFLLENBQ0osVUFBVSxFQUNWLFlBQVksQ0FBQyxhQUFhLEVBQUUsRUFDNUIsdUJBQXVCLEVBQ3ZCLGlCQUFpQixFQUNqQixvQkFBb0IsRUFDcEIsaUJBQWlCLEVBQ2pCLDBCQUEwQixFQUMxQixxQkFBcUIsQ0FDckIsQ0FBQTtRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUE7UUFFaEMsNkJBQTZCO1FBQzdCLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNuRixDQUFBO0lBQ0YsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVPLDZCQUE2QixDQUFDLENBQTRCO1FBQ2pFLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVRLGFBQWEsQ0FBQyxVQUEwQjtRQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQWxEWSx3QkFBd0I7SUFTbEMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHNCQUFzQixDQUFBO0dBYlosd0JBQXdCLENBa0RwQyJ9