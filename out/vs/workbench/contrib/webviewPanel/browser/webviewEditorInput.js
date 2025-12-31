/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
export class WebviewInput extends EditorInput {
    static { this.typeId = 'workbench.editors.webviewInput'; }
    get typeId() {
        return WebviewInput.typeId;
    }
    get editorId() {
        return this.viewType;
    }
    get capabilities() {
        return (2 /* EditorInputCapabilities.Readonly */ |
            8 /* EditorInputCapabilities.Singleton */ |
            128 /* EditorInputCapabilities.CanDropIntoEditor */);
    }
    get resource() {
        return URI.from({
            scheme: Schemas.webviewPanel,
            path: `webview-panel/webview-${this._resourceId}`,
        });
    }
    constructor(init, webview, _iconManager) {
        super();
        this._iconManager = _iconManager;
        this._resourceId = generateUuid();
        this._hasTransfered = false;
        this.viewType = init.viewType;
        this.providedId = init.providedId;
        this._name = init.name;
        this._webview = webview;
    }
    dispose() {
        if (!this.isDisposed()) {
            if (!this._hasTransfered) {
                this._webview?.dispose();
            }
        }
        super.dispose();
    }
    getName() {
        return this._name;
    }
    getTitle(_verbosity) {
        return this.getName();
    }
    getDescription() {
        return undefined;
    }
    setName(value) {
        this._name = value;
        this.webview.setTitle(value);
        this._onDidChangeLabel.fire();
    }
    get webview() {
        return this._webview;
    }
    get extension() {
        return this.webview.extension;
    }
    get iconPath() {
        return this._iconPath;
    }
    set iconPath(value) {
        this._iconPath = value;
        this._iconManager.setIcons(this._resourceId, value);
    }
    matches(other) {
        return super.matches(other) || other === this;
    }
    get group() {
        return this._group;
    }
    updateGroup(group) {
        this._group = group;
    }
    transfer(other) {
        if (this._hasTransfered) {
            return undefined;
        }
        this._hasTransfered = true;
        other._webview = this._webview;
        return other;
    }
    claim(claimant, targetWindow, scopedContextKeyService) {
        return this._webview.claim(claimant, targetWindow, scopedContextKeyService);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBUTlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQVVuRSxNQUFNLE9BQU8sWUFBYSxTQUFRLFdBQVc7YUFDOUIsV0FBTSxHQUFHLGdDQUFnQyxBQUFuQyxDQUFtQztJQUV2RCxJQUFvQixNQUFNO1FBQ3pCLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBb0IsUUFBUTtRQUMzQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVELElBQW9CLFlBQVk7UUFDL0IsT0FBTyxDQUNOO3FEQUNpQzsrREFDUSxDQUN6QyxDQUFBO0lBQ0YsQ0FBQztJQVlELElBQUksUUFBUTtRQUNYLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztZQUNmLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWTtZQUM1QixJQUFJLEVBQUUseUJBQXlCLElBQUksQ0FBQyxXQUFXLEVBQUU7U0FDakQsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUtELFlBQ0MsSUFBMEIsRUFDMUIsT0FBd0IsRUFDUCxZQUFnQztRQUVqRCxLQUFLLEVBQUUsQ0FBQTtRQUZVLGlCQUFZLEdBQVosWUFBWSxDQUFvQjtRQXZCakMsZ0JBQVcsR0FBRyxZQUFZLEVBQUUs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