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
import { CodeEditorWidget } from './codeEditorWidget.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
let EmbeddedCodeEditorWidget = class EmbeddedCodeEditorWidget extends CodeEditorWidget {
    constructor(domElement, options, codeEditorWidgetOptions, parentEditor, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super(domElement, {
            ...parentEditor.getRawOptions(),
            overflowWidgetsDomNode: parentEditor.getOverflowWidgetsDomNode(),
        }, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService);
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
EmbeddedCodeEditorWidget = __decorate([
    __param(4, IInstantiationService),
    __param(5, ICodeEditorService),
    __param(6, ICommandService),
    __param(7, IContextKeyService),
    __param(8, IThemeService),
    __param(9, INotificationService),
    __param(10, IAccessibilityService),
    __param(11, ILanguageConfigurationService),
    __param(12, ILanguageFeaturesService)
], EmbeddedCodeEditorWidget);
export { EmbeddedCodeEditorWidget };
export function getOuterEditor(accessor) {
    const editor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
    if (editor instanceof EmbeddedCodeEditorWidget) {
        return editor.getParentEditor();
    }
    return editor;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZWRDb2RlRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2NvZGVFZGl0b3IvZW1iZWRkZWRDb2RlRWRpdG9yV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGdCQUFnQixFQUE0QixNQUFNLHVCQUF1QixDQUFBO0FBRWxGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzFHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRTFFLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsZ0JBQWdCO0lBSTdELFlBQ0MsVUFBdUIsRUFDdkIsT0FBdUIsRUFDdkIsdUJBQWlELEVBQ2pELFlBQXlCLEVBQ0Ysb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUN4QyxjQUErQixFQUM1QixpQkFBcUMsRUFDMUMsWUFBMkIsRUFDcEIsbUJBQXlDLEVBQ3hDLG9CQUEyQyxFQUNuQyw0QkFBMkQsRUFDaEUsdUJBQWlEO1FBRTNFLEtBQUssQ0FDSixVQUFVLEVBQ1Y7WUFDQyxHQUFHLFlBQVksQ0FBQyxhQUFhLEVBQUU7WUFDL0Isc0JBQXNCLEVBQUUsWUFBWSxDQUFDLHlCQUF5QixFQUFFO1NBQ2hFLEVBQ0QsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsY0FBYyxFQUNkLGlCQUFpQixFQUNqQixZQUFZLEVBQ1osbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQiw0QkFBNEIsRUFDNUIsdUJBQXVCLENBQ3ZCLENBQUE7UUFFRCxJQUFJLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQTtRQUNqQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFBO1FBRWhDLDZCQUE2QjtRQUM3QixLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBRTNDLElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBNEIsRUFBRSxFQUFFLENBQ3RFLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsQ0FDckMsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLElBQUksQ0FBQyxhQUFhLENBQUE7SUFDMUIsQ0FBQztJQUVPLDZCQUE2QixDQUFDLENBQTRCO1FBQ2pFLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVRLGFBQWEsQ0FBQyxVQUEwQjtRQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDdkQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0QsQ0FBQTtBQS9EWSx3QkFBd0I7SUFTbEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsWUFBQSxxQkFBcUIsQ0FBQTtJQUNyQixZQUFBLDZCQUE2QixDQUFBO0lBQzdCLFlBQUEsd0JBQXdCLENBQUE7R0FqQmQsd0JBQXdCLENBK0RwQzs7QUFFRCxNQUFNLFVBQVUsY0FBYyxDQUFDLFFBQTBCO0lBQ3hELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO0lBQ3RFLElBQUksTUFBTSxZQUFZLHdCQUF3QixFQUFFLENBQUM7UUFDaEQsT0FBTyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDaEMsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyJ9