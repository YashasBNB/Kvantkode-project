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
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Schemas, matchesSomeScheme } from '../../../../base/common/network.js';
import { dirname, isEqual } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { BreadcrumbsConfig } from './breadcrumbs.js';
import { IOutlineService, } from '../../../services/outline/browser/outline.js';
export class FileElement {
    constructor(uri, kind) {
        this.uri = uri;
        this.kind = kind;
    }
}
export class OutlineElement2 {
    constructor(element, outline) {
        this.element = element;
        this.outline = outline;
    }
}
let BreadcrumbsModel = class BreadcrumbsModel {
    constructor(resource, editor, configurationService, _workspaceService, _outlineService) {
        this.resource = resource;
        this.editor = editor;
        this._workspaceService = _workspaceService;
        this._outlineService = _outlineService;
        this._disposables = new DisposableStore();
        this._currentOutline = new MutableDisposable();
        this._outlineDisposables = new DisposableStore();
        this._onDidUpdate = new Emitter();
        this.onDidUpdate = this._onDidUpdate.event;
        this._cfgFilePath = BreadcrumbsConfig.FilePath.bindTo(configurationService);
        this._cfgSymbolPath = BreadcrumbsConfig.SymbolPath.bindTo(configurationService);
        this._disposables.add(this._cfgFilePath.onDidChange((_) => this._onDidUpdate.fire(this)));
        this._disposables.add(this._cfgSymbolPath.onDidChange((_) => this._onDidUpdate.fire(this)));
        this._workspaceService.onDidChangeWorkspaceFolders(this._onDidChangeWorkspaceFolders, this, this._disposables);
        this._fileInfo = this._initFilePathInfo(resource);
        if (editor) {
            this._bindToEditor(editor);
            this._disposables.add(_outlineService.onDidChange(() => this._bindToEditor(editor)));
            this._disposables.add(editor.onDidChangeControl(() => this._bindToEditor(editor)));
        }
        this._onDidUpdate.fire(this);
    }
    dispose() {
        this._disposables.dispose();
        this._cfgFilePath.dispose();
        this._cfgSymbolPath.dispose();
        this._currentOutline.dispose();
        this._outlineDisposables.dispose();
        this._onDidUpdate.dispose();
    }
    isRelative() {
        return Boolean(this._fileInfo.folder);
    }
    getElements() {
        let result = [];
        // file path elements
        if (this._cfgFilePath.getValue() === 'on') {
            result = result.concat(this._fileInfo.path);
        }
        else if (this._cfgFilePath.getValue() === 'last' && this._fileInfo.path.length > 0) {
            result = result.concat(this._fileInfo.path.slice(-1));
        }
        if (this._cfgSymbolPath.getValue() === 'off') {
            return result;
        }
        if (!this._currentOutline.value) {
            return result;
        }
        const breadcrumbsElements = this._currentOutline.value.config.breadcrumbsDataSource.getBreadcrumbElements();
        for (let i = this._cfgSymbolPath.getValue() === 'last' && breadcrumbsElements.length > 0
            ? breadcrumbsElements.length - 1
            : 0; i < breadcrumbsElements.length; i++) {
            result.push(new OutlineElement2(breadcrumbsElements[i], this._currentOutline.value));
        }
        if (breadcrumbsElements.length === 0 && !this._currentOutline.value.isEmpty) {
            result.push(new OutlineElement2(this._currentOutline.value, this._currentOutline.value));
        }
        return result;
    }
    _initFilePathInfo(uri) {
        if (matchesSomeScheme(uri, Schemas.untitled, Schemas.data)) {
            return {
                folder: undefined,
                path: [],
            };
        }
        const info = {
            folder: this._workspaceService.getWorkspaceFolder(uri) ?? undefined,
            path: [],
        };
        let uriPrefix = uri;
        while (uriPrefix && uriPrefix.path !== '/') {
            if (info.folder && isEqual(info.folder.uri, uriPrefix)) {
                break;
            }
            info.path.unshift(new FileElement(uriPrefix, info.path.length === 0 ? FileKind.FILE : FileKind.FOLDER));
            const prevPathLength = uriPrefix.path.length;
            uriPrefix = dirname(uriPrefix);
            if (uriPrefix.path.length === prevPathLength) {
                break;
            }
        }
        if (info.folder && this._workspaceService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            info.path.unshift(new FileElement(info.folder.uri, FileKind.ROOT_FOLDER));
        }
        return info;
    }
    _onDidChangeWorkspaceFolders() {
        this._fileInfo = this._initFilePathInfo(this.resource);
        this._onDidUpdate.fire(this);
    }
    _bindToEditor(editor) {
        const newCts = new CancellationTokenSource();
        this._currentOutline.clear();
        this._outlineDisposables.clear();
        this._outlineDisposables.add(toDisposable(() => newCts.dispose(true)));
        this._outlineService
            .createOutline(editor, 2 /* OutlineTarget.Breadcrumbs */, newCts.token)
            .then((outline) => {
            if (newCts.token.isCancellationRequested) {
                // cancelled: dispose new outline and reset
                outline?.dispose();
                outline = undefined;
            }
            this._currentOutline.value = outline;
            this._onDidUpdate.fire(this);
            if (outline) {
                this._outlineDisposables.add(outline.onDidChange(() => this._onDidUpdate.fire(this)));
            }
        })
            .catch((err) => {
            this._onDidUpdate.fire(this);
            onUnexpectedError(err);
        });
    }
};
BreadcrumbsModel = __decorate([
    __param(2, IConfigurationService),
    __param(3, IWorkspaceContextService),
    __param(4, IOutlineService)
], BreadcrumbsModel);
export { BreadcrumbsModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWRjcnVtYnNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2VkaXRvci9icmVhZGNydW1ic01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDckUsT0FBTyxFQUNOLHdCQUF3QixHQUd4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXBELE9BQU8sRUFFTixlQUFlLEdBRWYsTUFBTSw4Q0FBOEMsQ0FBQTtBQUVyRCxNQUFNLE9BQU8sV0FBVztJQUN2QixZQUNVLEdBQVEsRUFDUixJQUFjO1FBRGQsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFNBQUksR0FBSixJQUFJLENBQVU7SUFDckIsQ0FBQztDQUNKO0FBSUQsTUFBTSxPQUFPLGVBQWU7SUFDM0IsWUFDVSxPQUE0QixFQUM1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