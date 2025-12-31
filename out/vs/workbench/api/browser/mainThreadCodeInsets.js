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
import { getWindow } from '../../../base/browser/dom.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { ICodeEditorService } from '../../../editor/browser/services/codeEditorService.js';
import { reviveWebviewContentOptions } from './mainThreadWebviews.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { IWebviewService } from '../../contrib/webview/browser/webview.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
// todo@jrieken move these things back into something like contrib/insets
class EditorWebviewZone {
    // suppressMouseDown?: boolean | undefined;
    // heightInPx?: number | undefined;
    // minWidthInPx?: number | undefined;
    // marginDomNode?: HTMLElement | null | undefined;
    // onDomNodeTop?: ((top: number) => void) | undefined;
    // onComputedHeight?: ((height: number) => void) | undefined;
    constructor(editor, line, height, webview) {
        this.editor = editor;
        this.line = line;
        this.height = height;
        this.webview = webview;
        this.domNode = document.createElement('div');
        this.domNode.style.zIndex = '10'; // without this, the webview is not interactive
        this.afterLineNumber = line;
        this.afterColumn = 1;
        this.heightInLines = height;
        editor.changeViewZones((accessor) => (this._id = accessor.addZone(this)));
        webview.mountTo(this.domNode, getWindow(editor.getDomNode()));
    }
    dispose() {
        this.editor.changeViewZones((accessor) => this._id && accessor.removeZone(this._id));
    }
}
let MainThreadEditorInsets = class MainThreadEditorInsets {
    constructor(context, _editorService, _webviewService) {
        this._editorService = _editorService;
        this._webviewService = _webviewService;
        this._disposables = new DisposableStore();
        this._insets = new Map();
        this._proxy = context.getProxy(ExtHostContext.ExtHostEditorInsets);
    }
    dispose() {
        this._disposables.dispose();
    }
    async $createEditorInset(handle, id, uri, line, height, options, extensionId, extensionLocation) {
        let editor;
        id = id.substr(0, id.indexOf(',')); //todo@jrieken HACK
        for (const candidate of this._editorService.listCodeEditors()) {
            if (candidate.getId() === id &&
                candidate.hasModel() &&
                isEqual(candidate.getModel().uri, URI.revive(uri))) {
                editor = candidate;
                break;
            }
        }
        if (!editor) {
            setTimeout(() => this._proxy.$onDidDispose(handle));
            return;
        }
        const disposables = new DisposableStore();
        const webview = this._webviewService.createWebviewElement({
            title: undefined,
            options: {
                enableFindWidget: false,
            },
            contentOptions: reviveWebviewContentOptions(options),
            extension: { id: extensionId, location: URI.revive(extensionLocation) },
        });
        const webviewZone = new EditorWebviewZone(editor, line, height, webview);
        const remove = () => {
            disposables.dispose();
            this._proxy.$onDidDispose(handle);
            this._insets.delete(handle);
        };
        disposables.add(editor.onDidChangeModel(remove));
        disposables.add(editor.onDidDispose(remove));
        disposables.add(webviewZone);
        disposables.add(webview);
        disposables.add(webview.onMessage((msg) => this._proxy.$onDidReceiveMessage(handle, msg.message)));
        this._insets.set(handle, webviewZone);
    }
    $disposeEditorInset(handle) {
        const inset = this.getInset(handle);
        this._insets.delete(handle);
        inset.dispose();
    }
    $setHtml(handle, value) {
        const inset = this.getInset(handle);
        inset.webview.setHtml(value);
    }
    $setOptions(handle, options) {
        const inset = this.getInset(handle);
        inset.webview.contentOptions = reviveWebviewContentOptions(options);
    }
    async $postMessage(handle, value) {
        const inset = this.getInset(handle);
        inset.webview.postMessage(value);
        return true;
    }
    getInset(handle) {
        const inset = this._insets.get(handle);
        if (!inset) {
            throw new Error('Unknown inset');
        }
        return inset;
    }
};
MainThreadEditorInsets = __decorate([
    extHostNamedCustomer(MainContext.MainThreadEditorInsets),
    __param(1, ICodeEditorService),
    __param(2, IWebviewService)
], MainThreadEditorInsets);
export { MainThreadEditorInsets };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvZGVJbnNldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENvZGVJbnNldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUUxRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sY0FBYyxFQUdkLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sMENBQTBDLENBQUE7QUFDM0YsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBRTdELHlFQUF5RTtBQUN6RSxNQUFNLGlCQUFpQjtJQU90QiwyQ0FBMkM7SUFDM0MsbUNBQW1DO0lBQ25DLHFDQUFxQztJQUNyQyxrREFBa0Q7SUFDbEQsc0RBQXNEO0lBQ3RELDZEQUE2RDtJQUU3RCxZQUNVLE1BQXlCLEVBQ3pCLElBQVksRUFDWixNQUFjLEVBQ2QsT0FBd0I7UUFIeEIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7UUFDekIsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUNaLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDZCxZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQUVqQyxJQUFJLENBQUMs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