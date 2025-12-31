/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { asWebviewUri, webviewGenericCspSource, } from '../../contrib/webview/common/webview.js';
export class ExtHostEditorInsets {
    constructor(_proxy, _editors, _remoteInfo) {
        this._proxy = _proxy;
        this._editors = _editors;
        this._remoteInfo = _remoteInfo;
        this._handlePool = 0;
        this._disposables = new DisposableStore();
        this._insets = new Map();
        // dispose editor inset whenever the hosting editor goes away
        this._disposables.add(_editors.onDidChangeVisibleTextEditors(() => {
            const visibleEditor = _editors.getVisibleTextEditors();
            for (const value of this._insets.values()) {
                if (visibleEditor.indexOf(value.editor) < 0) {
                    value.inset.dispose(); // will remove from `this._insets`
                }
            }
        }));
    }
    dispose() {
        this._insets.forEach((value) => value.inset.dispose());
        this._disposables.dispose();
    }
    createWebviewEditorInset(editor, line, height, options, extension) {
        let apiEditor;
        for (const candidate of this._editors.getVisibleTextEditors(true)) {
            if (candidate.value === editor) {
                apiEditor = candidate;
                break;
            }
        }
        if (!apiEditor) {
            throw new Error('not a visible editor');
        }
        const that = this;
        const handle = this._handlePool++;
        const onDidReceiveMessage = new Emitter();
        const onDidDispose = new Emitter();
        const webview = new (class {
            constructor() {
                this._html = '';
                this._options = Object.create(null);
            }
            asWebviewUri(resource) {
                return asWebviewUri(resource, that._remoteInfo);
            }
            get cspSource() {
                return webviewGenericCspSource;
            }
            set options(value) {
                this._options = value;
                that._proxy.$setOptions(handle, value);
            }
            get options() {
                return this._options;
            }
            set html(value) {
                this._html = value;
                that._proxy.$setHtml(handle, value);
            }
            get html() {
                return this._html;
            }
            get onDidReceiveMessage() {
                return onDidReceiveMessage.event;
            }
            postMessage(message) {
                return that._proxy.$postMessage(handle, message);
            }
        })();
        const inset = new (class {
            constructor() {
                this.editor = editor;
                this.line = line;
                this.height = height;
                this.webview = webview;
                this.onDidDispose = onDidDispose.event;
            }
            dispose() {
                if (that._insets.has(handle)) {
                    that._insets.delete(handle);
                    that._proxy.$disposeEditorInset(handle);
                    onDidDispose.fire();
                    // final cleanup
                    onDidDispose.dispose();
                    onDidReceiveMessage.dispose();
                }
            }
        })();
        this._proxy.$createEditorInset(handle, apiEditor.id, apiEditor.value.document.uri, line + 1, height, options || {}, extension.identifier, extension.extensionLocation);
        this._insets.set(handle, { editor, inset, onDidReceiveMessage });
        return inset;
    }
    $onDidDispose(handle) {
        const value = this._insets.get(handle);
        if (value) {
            value.inset.dispose();
        }
    }
    $onDidReceiveMessage(handle, message) {
        const value = this._insets.get(handle);
        value?.onDidReceiveMessage.fire(message);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvZGVJbnNldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29kZUluc2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSW5FLE9BQU8sRUFDTixZQUFZLEVBQ1osdUJBQXVCLEdBRXZCLE1BQU0seUNBQXlDLENBQUE7QUFJaEQsTUFBTSxPQUFPLG1CQUFtQjtJQVkvQixZQUNrQixNQUFtQyxFQUNuQyxRQUF3QixFQUN4QixXQUE4QjtRQUY5QixXQUFNLEdBQU4sTUFBTSxDQUE2QjtRQUNuQyxhQUFRLEdBQVIsUUFBUSxDQUFnQjtRQUN4QixnQkFBVyxHQUFYLFdBQVcsQ0FBbUI7UUFkeEMsZ0JBQVcsR0FBRyxDQUFDLENBQUE7UUFDTixpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDN0MsWUFBTyxHQUFHLElBQUksR0FBRyxFQU90QixDQUFBO1FBT0YsNkRBQTZEO1FBQzdELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixRQUFRLENBQUMsNkJBQTZCLENBQUMsR0FBRyxFQUFFO1lBQzNDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQ3RELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM3QyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBLENB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