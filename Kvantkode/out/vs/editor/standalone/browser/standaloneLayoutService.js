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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxheW91dFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZUxheW91dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNoRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUVOLGNBQWMsR0FDZCxNQUFNLG1EQUFtRCxDQUFBO0FBRTFELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBUzVCLElBQUksYUFBYTtRQUNoQixPQUFPLENBQ04sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxtQkFBbUIsRUFBRTtZQUN0RSxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDeEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLGVBQWU7UUFDbEIsTUFBTSxnQkFBZ0IsR0FDckIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFO1lBQzlDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRSxDQUFBO1FBRTlDLE9BQU8sZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQ3JFLENBQUM7SUFFRCxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCxJQUFJLHdCQUF3QjtRQUMzQixPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFLRCxJQUFJLFVBQVU7UUFDYixPQUFPLFFBQVEsQ0FDZCxJQUFJLENBQUMsa0JBQWtCO2FBQ3JCLGVBQWUsRUFBRTthQUNqQixHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQ3ZELENBQUE7SUFDRixDQUFDO0lBRUQsWUFBWTtRQUNYLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUM1QixDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGtCQUFrQixDQUFDLG9CQUFvQixFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUE7SUFDeEQsQ0FBQztJQUVELFlBQWdDLGtCQUE4QztRQUF0Qyx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBcERyRSw2QkFBd0IsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3JDLCtCQUEwQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDdkMseUJBQW9CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNqQywrQkFBMEIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3ZDLHNCQUFpQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUF5QjlCLHdCQUFtQixHQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFBO1FBQ3BFLDBCQUFxQixHQUFzQixFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFBO0lBc0JFLENBQUM7Q0FDbEYsQ0FBQTtBQXhESyx1QkFBdUI7SUF1RGYsV0FBQSxrQkFBa0IsQ0FBQTtHQXZEMUIsdUJBQXVCLENBd0Q1QjtBQUVNLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsdUJBQXVCO0lBQ3JFLElBQWEsYUFBYTtRQUN6QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUE7SUFDdkIsQ0FBQztJQUNELFlBQ1MsVUFBdUIsRUFDWCxpQkFBcUM7UUFFekQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFIaEIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUloQyxDQUFDO0NBQ0QsQ0FBQTtBQVZZLHlCQUF5QjtJQU1uQyxXQUFBLGtCQUFrQixDQUFBO0dBTlIseUJBQXlCLENBVXJDOztBQUVELGlCQUFpQixDQUFDLGNBQWMsRUFBRSx1QkFBdUIsb0NBQTRCLENBQUEifQ==