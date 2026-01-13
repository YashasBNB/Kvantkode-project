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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { Event } from '../../../../base/common/event.js';
let DiffEditorActiveAnnouncementContribution = class DiffEditorActiveAnnouncementContribution extends Disposable {
    static { this.ID = 'workbench.contrib.diffEditorActiveAnnouncement'; }
    constructor(_editorService, _accessibilityService, _configurationService) {
        super();
        this._editorService = _editorService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._register(Event.runAndSubscribe(_accessibilityService.onDidChangeScreenReaderOptimized, () => this._updateListener()));
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */)) {
                this._updateListener();
            }
        }));
    }
    _updateListener() {
        const announcementEnabled = this._configurationService.getValue("accessibility.verbosity.diffEditorActive" /* AccessibilityVerbositySettingId.DiffEditorActive */);
        const screenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (!announcementEnabled || !screenReaderOptimized) {
            this._onDidActiveEditorChangeListener?.dispose();
            this._onDidActiveEditorChangeListener = undefined;
            return;
        }
        if (this._onDidActiveEditorChangeListener) {
            return;
        }
        this._onDidActiveEditorChangeListener = this._register(this._editorService.onDidActiveEditorChange(() => {
            if (isDiffEditor(this._editorService.activeTextEditorControl)) {
                this._accessibilityService.alert(localize('openDiffEditorAnnouncement', 'Diff editor'));
            }
        }));
    }
};
DiffEditorActiveAnnouncementContribution = __decorate([
    __param(0, IEditorService),
    __param(1, IAccessibilityService),
    __param(2, IConfigurationService)
], DiffEditorActiveAnnouncementContribution);
export { DiffEditorActiveAnnouncementContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkRpZmZFZGl0b3JBbm5vdW5jZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvb3BlbkRpZmZFZGl0b3JBbm5vdW5jZW1lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUdqRCxJQUFNLHdDQUF3QyxHQUE5QyxNQUFNLHdDQUNaLFNBQVEsVUFBVTthQUdGLE9BQUUsR0FBRyxnREFBZ0QsQUFBbkQsQ0FBbUQ7SUFJckUsWUFDa0MsY0FBOEIsRUFDdkIscUJBQTRDLEVBQzVDLHFCQUE0QztRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUowQixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDdkIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBR3BGLElBQUksQ0FBQyxTQUFTLENBQ2IsS0FBSyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUUsQ0FDbEYsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUN0QixDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLG1HQUFrRCxFQUFFLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtZQUN2QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsbUdBRTlELENBQUE7UUFDRCxNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBRWxGLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLHFCQUFxQixFQUFFLENBQUM7WUFDcEQsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLE9BQU8sRUFBRSxDQUFBO1lBQ2hELElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxTQUFTLENBQUE7WUFDakQsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxDQUFDO1lBQzNDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ3JELElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2hELElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQzs7QUFuRFcsd0NBQXdDO0lBU2xELFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBWFgsd0NBQXdDLENBb0RwRCJ9