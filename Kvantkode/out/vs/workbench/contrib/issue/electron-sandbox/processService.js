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
import { getZoomLevel } from '../../../../base/browser/browser.js';
import { platform } from '../../../../base/common/process.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IProcessMainService, } from '../../../../platform/process/common/process.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { activeContrastBorder, editorBackground, editorForeground, listActiveSelectionBackground, listActiveSelectionForeground, listFocusBackground, listFocusForeground, listFocusOutline, listHoverBackground, listHoverForeground, scrollbarShadow, scrollbarSliderActiveBackground, scrollbarSliderBackground, scrollbarSliderHoverBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { IWorkbenchProcessService } from '../common/issue.js';
import { mainWindow } from '../../../../base/browser/window.js';
let ProcessService = class ProcessService {
    constructor(processMainService, themeService, environmentService, productService) {
        this.processMainService = processMainService;
        this.themeService = themeService;
        this.environmentService = environmentService;
        this.productService = productService;
    }
    openProcessExplorer() {
        const theme = this.themeService.getColorTheme();
        const data = {
            pid: this.environmentService.mainPid,
            zoomLevel: getZoomLevel(mainWindow),
            styles: {
                backgroundColor: getColor(theme, editorBackground),
                color: getColor(theme, editorForeground),
                listHoverBackground: getColor(theme, listHoverBackground),
                listHoverForeground: getColor(theme, listHoverForeground),
                listFocusBackground: getColor(theme, listFocusBackground),
                listFocusForeground: getColor(theme, listFocusForeground),
                listFocusOutline: getColor(theme, listFocusOutline),
                listActiveSelectionBackground: getColor(theme, listActiveSelectionBackground),
                listActiveSelectionForeground: getColor(theme, listActiveSelectionForeground),
                listHoverOutline: getColor(theme, activeContrastBorder),
                scrollbarShadowColor: getColor(theme, scrollbarShadow),
                scrollbarSliderActiveBackgroundColor: getColor(theme, scrollbarSliderActiveBackground),
                scrollbarSliderBackgroundColor: getColor(theme, scrollbarSliderBackground),
                scrollbarSliderHoverBackgroundColor: getColor(theme, scrollbarSliderHoverBackground),
            },
            platform: platform,
            applicationName: this.productService.applicationName,
        };
        return this.processMainService.openProcessExplorer(data);
    }
};
ProcessService = __decorate([
    __param(0, IProcessMainService),
    __param(1, IThemeService),
    __param(2, INativeWorkbenchEnvironmentService),
    __param(3, IProductService)
], ProcessService);
export { ProcessService };
function getColor(theme, key) {
    const color = theme.getColor(key);
    return color ? color.toString() : undefined;
}
registerSingleton(IWorkbenchProcessService, ProcessService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2VsZWN0cm9uLXNhbmRib3gvcHJvY2Vzc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZiwrQkFBK0IsRUFDL0IseUJBQXlCLEVBQ3pCLDhCQUE4QixHQUM5QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBYztJQUcxQixZQUN1Qyxr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