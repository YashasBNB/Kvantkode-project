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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0VkaXRvcklucHV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3RWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFROUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBVW5FLE1BQU0sT0FBTyxZQUFhLFNBQVEsV0FBVzthQUM5QixXQUFNLEdBQUcsZ0NBQWdDLEFBQW5DLENBQW1DO0lBRXZELElBQW9CLE1BQU07UUFDekIsT0FBTyxZQUFZLENBQUMsTUFBTSxDQUFBO0lBQzNCLENBQUM7SUFFRCxJQUFvQixRQUFRO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQTtJQUNyQixDQUFDO0lBRUQsSUFBb0IsWUFBWTtRQUMvQixPQUFPLENBQ047cURBQ2lDOytEQUNRLENBQ3pDLENBQUE7SUFDRixDQUFDO0lBWUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2YsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZO1lBQzVCLElBQUksRUFBRSx5QkFBeUIsSUFBSSxDQUFDLFdBQVcsRUFBRTtTQUNqRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBS0QsWUFDQyxJQUEwQixFQUMxQixPQUF3QixFQUNQLFlBQWdDO1FBRWpELEtBQUssRUFBRSxDQUFBO1FBRlUsaUJBQVksR0FBWixZQUFZLENBQW9CO1FBdkJqQyxnQkFBVyxHQUFHLFlBQVks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