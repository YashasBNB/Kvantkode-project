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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvZGVJbnNldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDb2RlSW5zZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJbkUsT0FBTyxFQUNOLFlBQVksRUFDWix1QkFBdUIsR0FFdkIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUloRCxNQUFNLE9BQU8sbUJBQW1CO0lBWS9CLFlBQ2tCLE1BQW1DLEVBQ25DLFFBQXdCLEVBQ3hCLFdBQThCO1FBRjlCLFdBQU0sR0FBTixNQUFNLENBQTZCO1FBQ25DLGFBQVEsR0FBUixRQUFRLENBQWdCO1FBQ3hCLGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQWR4QyxnQkFBVyxHQUFHLENBQUMsQ0FBQTtRQUNOLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUM3QyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBT3RCLENBQUE7UUFPRiw2REFBNkQ7UUFDN0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQ3BCLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEVBQUU7WUFDM0MsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFDdEQsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQzNDLElBQUksYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQzdDLEtBQUssQ0FBQyxLQUFL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