/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
export class OpenWebviewDeveloperToolsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.webview.openDeveloperTools',
            title: nls.localize2('openToolsLabel', 'Open Webview Developer Tools'),
            category: Categories.Developer,
            metadata: {
                description: nls.localize('openToolsDescription', 'Opens Developer Tools for active webviews'),
            },
            f1: true,
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const iframeWebviewElements = getActiveWindow().document.querySelectorAll('iframe.webview.ready');
        if (iframeWebviewElements.length) {
            console.info(nls.localize('iframeWebviewAlert', 'Using standard dev tools to debug iframe based webview'));
            nativeHostService.openDevTools();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0NvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlldy9lbGVjdHJvbi1zYW5kYm94L3dlYnZpZXdDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXhFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWpGLE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxPQUFPO0lBQzNEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZDQUE2QztZQUNqRCxLQUFLLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSw4QkFBOEIsQ0FBQztZQUN0RSxRQUFRLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDOUIsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixzQkFBc0IsRUFDdEIsMkNBQTJDLENBQzNDO2FBQ0Q7WUFDRCxFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFELE1BQU0scUJBQXFCLEdBQzFCLGVBQWUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ3BFLElBQUkscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsT0FBTyxDQUFDLElBQUksQ0FDWCxHQUFHLENBQUMsUUFBUSxDQUNYLG9CQUFvQixFQUNwQix3REFBd0QsQ0FDeEQsQ0FDRCxDQUFBO1lBQ0QsaUJBQWlCLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDakMsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9