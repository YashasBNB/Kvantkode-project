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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUNvbG9yUGlja2VyQ29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9zdGFuZGFsb25lQ29sb3JQaWNrZXIvc3RhbmRhbG9uZUNvbG9yUGlja2VyQ29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBR3JHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUU3RCxJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7O2FBQ2hELE9BQUUsR0FBRyxnREFBZ0QsQUFBbkQsQ0FBbUQ7SUFLbkUsWUFDa0IsT0FBb0IsRUFDakIsa0JBQXNDLEVBQ25DLHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUpVLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFFRywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBUDdFLGlDQUE0QixHQUF1QyxJQUFJLENBQUE7UUFVOUUsSUFBSSxDQUFDLDZCQUE2QjtZQUNqQyxpQkFBaUIsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRSxJQUFJLENBQUMsNkJBQTZCO1lBQ2pDLGlCQUFpQixDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQzNFLENBQUM7SUFFTSxXQUFXO1FBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7WUFDOUIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDL0MsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQzVFLDJCQUEyQixFQUMzQixJQUFJLENBQUMsT0FBTyxFQUNaLElBQUksQ0FBQyw2QkFBNkIsRUFDbEMsSUFBSSxDQUFDLDZCQUE2QixDQUNsQyxDQUFBO1FBQ0YsQ0FBQzthQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFFTSxJQUFJO1FBQ1YsSUFBSSxDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzdDLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3JCLENBQUM7SUFFTSxXQUFXO1FBQ2pCLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxZQUFZLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQzVCLGlDQUErQixDQUFDLEVBQUUsQ0FDbEMsQ0FBQTtJQUNGLENBQUM7O0FBbERXLCtCQUErQjtJQVF6QyxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEscUJBQXFCLENBQUE7R0FUWCwrQkFBK0IsQ0FtRDNDIn0=