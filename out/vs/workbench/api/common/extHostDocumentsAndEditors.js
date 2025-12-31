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
import * as assert from '../../../base/common/assert.js';
import { Emitter } from '../../../base/common/event.js';
import { dispose } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { MainContext, } from './extHost.protocol.js';
import { ExtHostDocumentData } from './extHostDocumentData.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostTextEditor } from './extHostTextEditor.js';
import * as typeConverters from './extHostTypeConverters.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ResourceMap } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import { Iterable } from '../../../base/common/iterator.js';
import { Lazy } from '../../../base/common/lazy.js';
class Reference {
    constructor(value) {
        this.value = value;
        this._count = 0;
    }
    ref() {
        this._count++;
    }
    unref() {
        return --this._count === 0;
    }
}
let ExtHostDocumentsAndEditors = class ExtHostDocumentsAndEditors {
    constructor(_extHostRpc, _logService) {
        this._extHostRpc = _extHostRpc;
        this._logService = _logService;
        this._activeEditorId = null;
        this._editors = new Map();
        this._documents = new ResourceMap();
        this._onDidAddDocuments = new Emitter();
        this._onDidRemoveDocuments = new Emitter();
        this._onDidChangeVisibleTextEditors = new Emitter();
        this._onDidChangeActiveTextEditor = new Emitter();
        this.onDidAddDocuments = this._onDidAddDocuments.event;
        this.onDidRemoveDocuments = this._onDidRemoveDocuments.event;
        this.onDidChangeVisibleTextEditors = this._onDidChangeVisibleTextEditors.event;
        this.onDidChangeActiveTextEditor = this._onDidChangeActiveTextEditor.event;
    }
    $acceptDocumentsAndEditorsDelta(delta) {
        this.acceptDocumentsAndEditorsDelta(delta);
    }
    acceptDocumentsAndEditorsDelta(delta) {
        const removedDocuments = [];
        const addedDocuments = [];
        const removedEditors = [];
        if (delta.removedDocuments) {
            for (const uriComponent of delta.removedDocuments) {
                const uri = URI.revive(uriComponent);
                const data = this._documents.get(uri);
                if (data?.unref()) {
                    this._documents.delete(uri);
                    removedDocuments.push(data.value);
                }
            }
        }
        if (delta.addedDocuments) {
            for (const data of delta.addedDocuments) {
                const resource = URI.revive(data.uri);
                let ref = this._documents.get(resource);
                // double check -> only notebook cell documents should be
                // referenced/opened more than once...
                if (ref) {
                    if (resource.scheme !== Schemas.vscodeNotebookCell &&
                        resource.scheme !== Schemas.vscodeInteractiveInput) {
                        throw new Error(`document '${resource} already exists!'`);
                    }
                }
                if (!ref) {
                    ref = new Reference(new ExtHostDocumentData(this._extHostRpc.getProxy(MainContext.MainThreadDocuments), resource, data.lines, data.EOL, data.versionId, data.languageId, data.isDirty, data.encoding));
                    this._documents.set(resource, ref);
                    addedDocuments.push(ref.value);
                }
                ref.ref();
            }
        }
        if (delta.removedEditors) {
            for (const id of delta.removedEditors) {
                const editor = this._editors.get(id);
                this._editors.delete(id);
                if (editor) {
                    removedEditors.push(editor);
                }
            }
        }
        if (delta.addedEditors) {
            for (const data of delta.addedEditors) {
                const resource = URI.revive(data.documentUri);
                assert.ok(this._documents.has(resource), `document '${resource}' does not exist`);
                assert.ok(!this._editors.has(data.id), `editor '${data.id}' already exists!`);
                const documentData = this._documents.get(resource).value;
                const editor = new ExtHostTextEditor(data.id, this._extHostRpc.getProxy(MainContext.MainThreadTextEditors), this._logService, new Lazy(() => documentData.document), data.selections.map(typeConverters.Selection.to), data.options, data.visibleRanges.map((range) => typeConverters.Range.to(range)), typeof data.editorPosition === 'number'
                    ? typeConverters.ViewColumn.to(data.editorPosition)
                    : undefined);
                this._editors.set(data.id, editor);
            }
        }
        if (delta.newActiveEditor !== undefined) {
            assert.ok(delta.newActiveEditor === null || this._editors.has(delta.newActiveEditor), `active editor '${delta.newActiveEditor}' does not exist`);
            this._activeEditorId = delta.newActiveEditor;
        }
        dispose(removedDocuments);
        dispose(removedEditors);
        // now that the internal state is complete, fire events
        if (delta.removedDocuments) {
            this._onDidRemoveDocuments.fire(removedDocuments);
        }
        if (delta.addedDocuments) {
            this._onDidAddDocuments.fire(addedDocuments);
        }
        if (delta.removedEditors || delta.addedEditors) {
            this._onDidChangeVisibleTextEditors.fire(this.allEditors().map((editor) => editor.value));
        }
        if (delta.newActiveEditor !== undefined) {
            this._onDidChangeActiveTextEditor.fire(this.activeEditor());
        }
    }
    getDocument(uri) {
        return this._documents.get(uri)?.value;
    }
    allDocuments() {
        return Iterable.map(this._documents.values(), (ref) => ref.value);
    }
    getEditor(id) {
        return this._editors.get(id);
    }
    activeEditor(internal) {
        if (!this._activeEditorId) {
            return undefined;
        }
        const editor = this._editors.get(this._activeEditorId);
        if (internal) {
            return editor;
        }
        else {
            return editor?.value;
        }
    }
    allEditors() {
        return [...this._editors.values()];
    }
};
ExtHostDocumentsAndEditors = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService)
], ExtHostDocumentsAndEditors);
export { ExtHostDocumentsAndEditors };
export const IExtHostDocumentsAndEditors = createDecorator('IExtHostDocumentsAndEditors');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50c0FuZEVkaXRvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RG9jdW1lbnRzQW5kRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBR04sV0FBVyxHQUNYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDM0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDMUQsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRW5ELE1BQU0sU0FBUztJQUVkLFlBQXFCLEtBQVE7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