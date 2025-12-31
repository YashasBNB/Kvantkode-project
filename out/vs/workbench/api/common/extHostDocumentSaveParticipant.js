/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { illegalState } from '../../../base/common/errors.js';
import { TextEdit } from './extHostTypes.js';
import { Range, TextDocumentSaveReason, EndOfLine } from './extHostTypeConverters.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export class ExtHostDocumentSaveParticipant {
    constructor(_logService, _documents, _mainThreadBulkEdits, _thresholds = {
        timeout: 1500,
        errors: 3,
    }) {
        this._logService = _logService;
        this._documents = _documents;
        this._mainThreadBulkEdits = _mainThreadBulkEdits;
        this._thresholds = _thresholds;
        this._callbacks = new LinkedList();
        this._badListeners = new WeakMap();
        //
    }
    dispose() {
        this._callbacks.clear();
    }
    getOnWillSaveTextDocumentEvent(extension) {
        return (listener, thisArg, disposables) => {
            const remove = this._callbacks.push([listener, thisArg, extension]);
            const result = { dispose: remove };
            if (Array.isArray(disposables)) {
                disposables.push(result);
            }
            return result;
        };
    }
    async $participateInSave(data, reason) {
        const resource = URI.revive(data);
        let didTimeout = false;
        const didTimeoutHandle = setTimeout(() => (didTimeout = true), this._thresholds.timeout);
        const results = [];
        try {
            for (const listener of [...this._callbacks]) {
                // copy to prevent concurrent modifications
                if (didTimeout) {
                    // timeout - no more listeners
                    break;
                }
                const document = this._documents.getDocument(resource);
                const success = await this._deliverEventAsyncAndBlameBadListeners(listener, {
                    document,
                    reason: TextDocumentSaveReason.to(reason),
                });
                results.push(success);
            }
        }
        finally {
            clearTimeout(didTimeoutHandle);
        }
        return results;
    }
    _deliverEventAsyncAndBlameBadListeners([listener, thisArg, extension], stubEvent) {
        const errors = this._badListeners.get(listener);
        if (typeof errors === 'number' && errors > this._thresholds.errors) {
            // bad listener - ignore
            return Promise.resolve(false);
        }
        return this._deliverEventAsync(extension, listener, thisArg, stubEvent).then(() => {
            // don't send result across the wire
            return true;
        }, (err) => {
            this._logService.error(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' threw ERROR`);
            this._logService.error(err);
            if (!(err instanceof Error) || err.message !== 'concurrent_edits') {
                const errors = this._badListeners.get(listener);
                this._badListeners.set(listener, !errors ? 1 : errors + 1);
                if (typeof errors === 'number' && errors > this._thresholds.errors) {
                    this._logService.info(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' will now be IGNORED because of timeouts and/or errors`);
                }
            }
            return false;
        });
    }
    _deliverEventAsync(extension, listener, thisArg, stubEvent) {
        const promises = [];
        const t1 = Date.now();
        const { document, reason } = stubEvent;
        const { version } = document;
        const event = Object.freeze({
            document,
            reason,
            waitUntil(p) {
                if (Object.isFrozen(promises)) {
                    throw illegalState('waitUntil can not be called async');
                }
                promises.push(Promise.resolve(p));
            },
        });
        try {
            // fire event
            listener.apply(thisArg, [event]);
        }
        catch (err) {
            return Promise.reject(err);
        }
        // freeze promises after event call
        Object.freeze(promises);
        return new Promise((resolve, reject) => {
            // join on all listener promises, reject after timeout
            const handle = setTimeout(() => reject(new Error('timeout')), this._thresholds.timeout);
            return Promise.all(promises)
                .then((edits) => {
                this._logService.debug(`onWillSaveTextDocument-listener from extension '${extension.identifier.value}' finished after ${Date.now() - t1}ms`);
                clearTimeout(handle);
                resolve(edits);
            })
                .catch((err) => {
                clearTimeout(handle);
                reject(err);
            });
        }).then((values) => {
            const dto = { edits: [] };
            for (const value of values) {
                if (Array.isArray(value) &&
                    value.every((e) => e instanceof TextEdit)) {
                    for (const { newText, newEol, range } of value) {
                        dto.edits.push({
                            resource: document.uri,
                            versionId: undefined,
                            textEdit: {
                                range: range && Range.from(range),
                                text: newText,
                                eol: newEol && EndOfLine.from(newEol),
                            },
                        });
                    }
                }
            }
            // apply edits if any and if document
            // didn't change somehow in the meantime
            if (dto.edits.length === 0) {
                return undefined;
            }
            if (version === document.version) {
                return this._mainThreadBulkEdits.$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers(dto));
            }
            return Promise.reject(new Error('concurrent_edits'));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBTTdELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBSXJGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUluRyxNQUFNLE9BQU8sOEJBQThCO0lBSTFDLFlBQ2tCLFdBQXdCLEVBQ3hCLFVBQTRCLEVBQzVCLG9CQUE4QyxFQUM5QyxjQUFtRDtRQUNuRSxPQUFPLEVBQUUsSUFBSTtRQUNiLE1BQU0sRUFBRSxDQUFDO0tBQ1Q7UUFOZ0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDeEIsZUFBVSxHQUFWLFVBQVUsQ0FBa0I7UUFDNUIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEwQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FHM0I7UUFWZSxlQUFVLEdBQUcsSUFBSSxVQUFVLEVBQVksQ0FBQTtRQUN2QyxrQkFBYSxHQUFHLElBQUksT0FBTyxFQUFvQixDQUFBO1FBVy9ELEVBQUU7SUFDSCxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDeEIsQ0FB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