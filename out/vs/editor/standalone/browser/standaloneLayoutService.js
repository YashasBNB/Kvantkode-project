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
import * as dom from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { coalesce } from '../../../base/common/arrays.js';
import { Event } from '../../../base/common/event.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { ILayoutService, } from '../../../platform/layout/browser/layoutService.js';
let StandaloneLayoutService = class StandaloneLayoutService {
    get mainContainer() {
        return (this._codeEditorService.listCodeEditors().at(0)?.getContainerDomNode() ??
            mainWindow.document.body);
    }
    get activeContainer() {
        const activeCodeEditor = this._codeEditorService.getFocusedCodeEditor() ??
            this._codeEditorService.getActiveCodeEditor();
        return activeCodeEditor?.getContainerDomNode() ?? this.mainContainer;
    }
    get mainContainerDimension() {
        return dom.getClientArea(this.mainContainer);
    }
    get activeContainerDimension() {
        return dom.getClientArea(this.activeContainer);
    }
    get containers() {
        return coalesce(this._codeEditorService
            .listCodeEditors()
            .map((codeEditor) => codeEditor.getContainerDomNode()));
    }
    getContainer() {
        return this.activeContainer;
    }
    whenContainerStylesLoaded() {
        return undefined;
    }
    focus() {
        this._codeEditorService.getFocusedCodeEditor()?.focus();
    }
    constructor(_codeEditorService) {
        this._codeEditorService = _codeEditorService;
        this.onDidLayoutMainContainer = Event.None;
        this.onDidLayoutActiveContainer = Event.None;
        this.onDidLayoutContainer = Event.None;
        this.onDidChangeActiveContainer = Event.None;
        this.onDidAddContainer = Event.None;
        this.mainContainerOffset = { top: 0, quickPickTop: 0 };
        this.activeContainerOffset = { top: 0, quickPickTop: 0 };
    }
};
StandaloneLayoutService = __decorate([
    __param(0, ICodeEditorService)
], StandaloneLayoutService);
let EditorScopedLayoutService = class EditorScopedLayoutService extends StandaloneLayoutService {
    get mainContainer() {
        return this._container;
    }
    constructor(_container, codeEditorService) {
        super(codeEditorService);
        this._container = _container;
    }
};
EditorScopedLayoutService = __decorate([
    __param(1, ICodeEditorService)
], EditorScopedLayoutService);
export { EditorScopedLayoutService };
registerSingleton(ILayoutService, StandaloneLayoutService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxheW91dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3N0YW5kYWxvbmVMYXlvdXRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDaEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixjQUFjLEdBQ2QsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjtJQVM1QixJQUFJLGFBQWE7UUFDaEIsT0FBTyxDQUNOLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsbUJBQW1CLEVBQUU7WUFDdEUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ3hCLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxlQUFlO1FBQ2xCLE1BQU0sZ0JBQWdCLEdBQ3JCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUU5QyxPQUFPLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUNyRSxDQUFDO0lBRUQsSUFBSSxzQkFBc0I7UUFDekIsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRUQsSUFBSSx3QkFBd0I7UUFDM0IsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBS0QsSUFBSSxVQUFVO1FBQ2IsT0FBTyxRQUFRLENBQ2QsSUFBSSxDQUFDLGtCQUFrQjthQUNyQixlQUFlLEVBQUU7YUFDakIsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUN2RCxDQUFBO0lBQ0YsQ0FBQztJQUVELFlBQVk7UUFDWCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVELHlCQUF5QjtRQUN4QixPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFBO0lBQ3hELENBQUM7SUFFRCxZQUFnQyxrQkFBOEM7UUFBdEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQXBEckUsNkJBQXdCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNyQywrQkFBMEIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3ZDLHlCQUFvQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDakMsK0JBQTBCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUN2QyxzQkFBaUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBeUI5Qix3QkFBbUIsR0FBc0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQTtRQUNwRSwwQkFBcUIsR0FBc0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQTtJQXNCRSxDQUFDO0NBQ2xGLENBQUE7QUF4REssdUJBQXVCO0lBdURmLFdBQUEsa0JBQWtCLENBQUE7R0F2RDFCLHVCQUF1QixDQXdENUI7QUFFTSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLHVCQUF1QjtJQUNyRSxJQUFhLGFBQWE7UUFDekIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxZQUNTLFVBQXVCLEVBQ1gsaUJBQXFDO1FBRXpELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBSGhCLGVBQVUsR0FBVixVQUFVLENBQWE7SUFJaEMsQ0FBQztDQUNELENBQUE7QUFWWSx5QkFBeUI7SUFNbkMsV0FBQSxrQkFBa0IsQ0FBQTtHQU5SLHlCQUF5QixDQVVyQzs7QUFFRCxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsdUJBQXVCLG9DQUE0QixDQUFBIn0=