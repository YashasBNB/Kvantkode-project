/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorTheme } from '../editorTheme.js';
export class ViewContext {
    constructor(configuration, theme, model) {
        this.configuration = configuration;
        this.theme = new EditorTheme(theme);
        this.viewModel = model;
        this.viewLayout = model.viewLayout;
    }
    addEventHandler(eventHandler) {
        this.viewModel.addViewEventHandler(eventHandler);
    }
    removeEventHandler(eventHandler) {
        this.viewModel.removeViewEventHandler(eventHandler);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld0NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC92aWV3Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFL0MsTUFBTSxPQUFPLFdBQVc7SUFNdkIsWUFBWSxhQUFtQyxFQUFFLEtBQWtCLEVBQUUsS0FBaUI7UUFDckYsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUE7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQTtRQUN0QixJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUE7SUFDbkMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxZQUE4QjtRQUNwRCxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxZQUE4QjtRQUN2RCxJQUFJLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3BELENBQUM7Q0FDRCJ9