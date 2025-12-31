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
var StandaloneColorPickerController_1;
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { EditorContextKeys } from '../../../../common/editorContextKeys.js';
import { StandaloneColorPickerWidget } from './standaloneColorPickerWidget.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
let StandaloneColorPickerController = class StandaloneColorPickerController extends Disposable {
    static { StandaloneColorPickerController_1 = this; }
    static { this.ID = 'editor.contrib.standaloneColorPickerController'; }
    constructor(_editor, _contextKeyService, _instantiationService) {
        super();
        this._editor = _editor;
        this._instantiationService = _instantiationService;
        this._standaloneColorPickerWidget = null;
        this._standaloneColorPickerVisible =
            EditorContextKeys.standaloneColorPickerVisible.bindTo(_contextKeyService);
        this._standaloneColorPickerFocused =
            EditorContextKeys.standaloneColorPickerFocused.bindTo(_contextKeyService);
    }
    showOrFocus() {
        if (!this._editor.hasModel()) {
            return;
        }
        if (!this._standaloneColorPickerVisible.get()) {
            this._standaloneColorPickerWidget = this._instantiationService.createInstance(StandaloneColorPickerWidget, this._editor, this._standaloneColorPickerVisible, this._standaloneColorPickerFocused);
        }
        else if (!this._standaloneColorPickerFocused.get()) {
            this._standaloneColorPickerWidget?.focus();
        }
    }
    hide() {
        this._standaloneColorPickerFocused.set(false);
        this._standaloneColorPickerVisible.set(false);
        this._standaloneColorPickerWidget?.hide();
        this._editor.focus();
    }
    insertColor() {
        this._standaloneColorPickerWidget?.updateEditor();
        this.hide();
    }
    static get(editor) {
        return editor.getContribution(StandaloneColorPickerController_1.ID);
    }
};
StandaloneColorPickerController = StandaloneColorPickerController_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService)
], StandaloneColorPickerController);
export { StandaloneColorPickerController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyL3N0YW5kYWxvbmVDb2xvclBpY2tlckNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUdyRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFN0QsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVOzthQUNoRCxPQUFFLEdBQUcsZ0RBQWdELEFBQW5ELENBQW1EO0lBS25FLFlBQ2tCLE9BQW9CLEVBQ2pCLGtCQUFzQyxFQUNuQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBRUcsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVA3RSxpQ0FBNEIsR0FBdUMsSUFBSSxDQUFBO1FBVTlFLElBQUksQ0FBQyw2QkFBNkI7WUFDakMsaUJBQWlCLENBQUMsNEJBQTRCLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDMUUsSUFBSSxDQUFDLDZCQUE2QjtZQUNqQyxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUMzRSxDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQzlCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQy9DLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUM1RSwyQkFBMkIsRUFDM0IsSUFBSSxDQUFDLE9BQU8sRUFDWixJQUFJLENBQUMsNkJBQTZCLEVBQ2xDLElBQUksQ0FBQyw2QkFBNkIsQ0FDbEMsQ0FBQTtRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLDRCQUE0QixFQUFFLEtBQUssRUFBRSxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0lBRU0sSUFBSTtRQUNWLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsNEJBQTRCLEVBQUUsSUFBSSxFQUFFLENBQUE7UUFDekMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNyQixDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLENBQUMsNEJBQTRCLEVBQUUsWUFBWSxFQUFFLENBQUE7UUFDakQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ1osQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBbUI7UUFDcEMsT0FBTyxNQUFNLENBQUMsZUFBZSxDQUM1QixpQ0FBK0IsQ0FBQyxFQUFFLENBQ2xDLENBQUE7SUFDRixDQUFDOztBQWxEVywrQkFBK0I7SUFRekMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHFCQUFxQixDQUFBO0dBVFgsK0JBQStCLENBbUQzQyJ9