/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { setWordDefinitionFor } from './extHostDocumentData.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { assertIsDefined } from '../../../base/common/types.js';
import { deepFreeze } from '../../../base/common/objects.js';
import { TextDocumentChangeReason } from './extHostTypes.js';
export class ExtHostDocuments {
    constructor(mainContext, documentsAndEditors) {
        this._onDidAddDocument = new Emitter();
        this._onDidRemoveDocument = new Emitter();
        this._onDidChangeDocument = new Emitter();
        this._onDidSaveDocument = new Emitter();
        this.onDidAddDocument = this._onDidAddDocument.event;
        this.onDidRemoveDocument = this._onDidRemoveDocument.event;
        this.onDidChangeDocument = this._onDidChangeDocument.event;
        this.onDidSaveDocument = this._onDidSaveDocument.event;
        this._toDispose = new DisposableStore();
        this._documentLoader = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadDocuments);
        this._documentsAndEditors = documentsAndEditors;
        this._documentsAndEditors.onDidRemoveDocuments((documents) => {
            for (const data of documents) {
                this._onDidRemoveDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
        this._documentsAndEditors.onDidAddDocuments((documents) => {
            for (const data of documents) {
                this._onDidAddDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
    }
    dispose() {
        this._toDispose.dispose();
    }
    getAllDocumentData() {
        return [...this._documentsAndEditors.allDocuments()];
    }
    getDocumentData(resource) {
        if (!resource) {
            return undefined;
        }
        const data = this._documentsAndEditors.getDocument(resource);
        if (data) {
            return data;
        }
        return undefined;
    }
    getDocument(resource) {
        const data = this.getDocumentData(resource);
        if (!data?.document) {
            throw new Error(`Unable to retrieve document from URI '${resource}'`);
        }
        return data.document;
    }
    ensureDocumentData(uri, options) {
        const cached = this._documentsAndEditors.getDocument(uri);
        if (cached && (!options?.encoding || cached.document.encoding === options.encoding)) {
            return Promise.resolve(cached);
        }
        let promise = this._documentLoader.get(uri.toString());
        if (!promise) {
            promise = this._proxy.$tryOpenDocument(uri, options).then((uriData) => {
                this._documentLoader.delete(uri.toString());
                const canonicalUri = URI.revive(uriData);
                return assertIsDefined(this._documentsAndEditors.getDocument(canonicalUri));
            }, (err) => {
                this._documentLoader.delete(uri.toString());
                return Promise.reject(err);
            });
            this._documentLoader.set(uri.toString(), promise);
        }
        else {
            if (options?.encoding) {
                promise = promise.then((data) => {
                    if (data.document.encoding !== options.encoding) {
                        return this.ensureDocumentData(uri, options);
                    }
                    return data;
                });
            }
        }
        return promise;
    }
    createDocumentData(options) {
        return this._proxy.$tryCreateDocument(options).then((data) => URI.revive(data));
    }
    $acceptModelLanguageChanged(uriComponents, newLanguageId) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        // Treat a language change as a remove + add
        this._onDidRemoveDocument.fire(data.document);
        data._acceptLanguageId(newLanguageId);
        this._onDidAddDocument.fire(data.document);
    }
    $acceptModelSaved(uriComponents) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        this.$acceptDirtyStateChanged(uriComponents, false);
        this._onDidSaveDocument.fire(data.document);
    }
    $acceptDirtyStateChanged(uriComponents, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
        });
    }
    $acceptEncodingChanged(uriComponents, encoding) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptEncoding(encoding);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
        });
    }
    $acceptModelChanged(uriComponents, events, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        data.onEvents(events);
        let reason = undefined;
        if (events.isUndoing) {
            reason = TextDocumentChangeReason.Undo;
        }
        else if (events.isRedoing) {
            reason = TextDocumentChangeReason.Redo;
        }
        this._onDidChangeDocument.fire(deepFreeze({
            document: data.document,
            contentChanges: events.changes.map((change) => {
                return {
                    range: TypeConverters.Range.to(change.range),
                    rangeOffset: change.rangeOffset,
                    rangeLength: change.rangeLength,
                    text: change.text,
                };
            }),
            reason,
        }));
    }
    setWordDefinitionFor(languageId, wordDefinition) {
        setWordDefinitionFor(languageId, wordDefinition);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFHTixXQUFXLEdBRVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQXVCLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFcEYsT0FBTyxLQUFLLGNBQWMsTUFBTSw0QkFBNEIsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRTVELE1BQU0sT0FBTyxnQkFBZ0I7SUFpQjVCLFlBQVksV0FBeUIsRUFBRSxtQkFBK0M7UUFoQnJFLHNCQUFpQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQ3RELHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQ3pELHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUFrQyxDQUFBO1FBQ3BFLHVCQUFrQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBRS9ELHFCQUFnQixHQUErQixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBQzNFLHdCQUFtQixHQUErQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FB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