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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZWRkZWRDb2RlRWRpdG9yV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvY29kZUVkaXRvci9lbWJlZGRlZENvZGVFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQTRCLE1BQU0sdUJBQXVCLENBQUE7QUFFbEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDMUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFMUUsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxnQkFBZ0I7SUFJN0QsWUFDQyxVQUF1QixFQUN2QixPQUF1QixFQUN2Qix1QkFBaUQsRUFDakQsWUFBeUIsRUFDRixvQkFBMkMsRUFDOUMsaUJBQXFDLEVBQ3hDLGNBQStCLEVBQzVCLGlCQUFxQyxFQUMxQyxZQUEyQixFQUNwQixtQkFBeUMsRUFDeEMsb0JBQTJDLEVBQ25DLDRCQUEyRCxFQUNoRSx1QkFBaUQ7UUFFM0UsS0FBSyxDQUNKLFVBQVUsRUFDVjtZQUNDLEdBQUcsWUFBWSxDQUFDLGFBQWEsRUFBRTtZQUMvQixzQkFBc0IsRUFBRSxZQUFZLENBQUMseUJBQXlCLEVBQUU7U0FDaEUsRUFDRCx1QkFBdUIsRUFDdkIsb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixjQUFjLEVBQ2QsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixtQkFBbUIsRUFDbkIsb0JBQW9CLEVBQ3BCLDRCQUE0QixFQUM1Qix1QkFBdUIsQ0FDdkIsQ0FBQTtRQUVELElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUE7UUFFaEMsNkJBQTZCO1FBQzdCLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFFM0MsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUE0QixFQUFFLEVBQUUsQ0FDdEUsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxDQUNyQyxDQUNELENBQUE7SUFDRixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU8sNkJBQTZCLENBQUMsQ0FBNEI7UUFDakUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUE7UUFDdkQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRVEsYUFBYSxDQUFDLFVBQTBCO1FBQ2hELE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2RCxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBL0RZLHdCQUF3QjtJQVNsQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsNkJBQTZCLENBQUE7SUFDN0IsWUFBQSx3QkFBd0IsQ0FBQTtHQWpCZCx3QkFBd0IsQ0ErRHBDOztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsUUFBMEI7SUFDeEQsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLG9CQUFvQixFQUFFLENBQUE7SUFDdEUsSUFBSSxNQUFNLFlBQVksd0JBQXdCLEVBQUUsQ0FBQztRQUNoRCxPQUFPLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUNoQyxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=