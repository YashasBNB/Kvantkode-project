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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvZGVJbnNldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ29kZUluc2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBRTFGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3JFLE9BQU8sRUFDTixjQUFjLEVBR2QsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUFFLGVBQWUsRUFBbUIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRixPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QseUVBQXlFO0FBQ3pFLE1BQU0saUJBQWlCO0lBT3RCLDJDQUEyQztJQUMzQyxtQ0FBbUM7SUFDbkMscUNBQXFDO0lBQ3JDLGtEQUFrRDtJQUNsRCxzREFBc0Q7SUFDdEQsNkRBQTZEO0lBRTdELFlBQ1UsTUFBeUIsRUFDekIsSUFBWSxFQUNaLE1BQWMsRUFDZCxPQUF3QjtRQUh4QixXQUFNLEdBQU4sTUFBTSxDQUFtQjtRQUN6QixTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLFlBQU8sR0FBUCxPQUFP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