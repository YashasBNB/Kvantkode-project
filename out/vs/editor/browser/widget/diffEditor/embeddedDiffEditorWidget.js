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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZWREaWZmRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9lbWJlZGRlZERpZmZFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQWdDLE1BQU0sdUJBQXVCLENBQUE7QUFNdEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDNUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxnQkFBZ0I7SUFJN0QsWUFDQyxVQUF1QixFQUN2QixPQUFpRCxFQUNqRCx1QkFBcUQsRUFDckQsWUFBeUIsRUFDTCxpQkFBcUMsRUFDbEMsb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUM1QiwwQkFBdUQsRUFDNUQscUJBQTZDO1FBRXJFLEtBQUssQ0FDSixVQUFVLEVBQ1YsWUFBWSxDQUFDLGFBQWEsRUFBRSxFQUM1Qix1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsMEJBQTBCLEVBQzFCLHFCQUFxQixDQUNyQixDQUFBO1FBRUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUE7UUFDakMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQTtRQUVoQyw2QkFBNkI7UUFDN0IsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUUzQyxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ25GLENBQUE7SUFDRixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU8sNkJBQTZCLENBQUMsQ0FBNEI7UUFDakUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDdkQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRVEsYUFBYSxDQUFDLFVBQTBCO1FBQ2hELE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBbERZLHdCQUF3QjtJQVNsQyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsc0JBQXNCLENBQUE7R0FiWix3QkFBd0IsQ0FrRHBDIn0=