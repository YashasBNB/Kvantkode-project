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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkRpZmZFZGl0b3JBbm5vdW5jZW1lbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5U2lnbmFscy9icm93c2VyL29wZW5EaWZmRWRpdG9yQW5ub3VuY2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFHakQsSUFBTSx3Q0FBd0MsR0FBOUMsTUFBTSx3Q0FDWixTQUFRLFVBQVU7YUFHRixPQUFFLEdBQUcsZ0RBQWdELEFBQW5ELENBQW1EO0lBSXJFLFlBQ2tDLGNBQThCLEVBQ3ZCLHFCQUE0QyxFQUM1QyxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFKMEIsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3ZCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUdwRixJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQUMscUJBQXFCLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFLENBQ2xGLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FDdEIsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxDQUFDLG9CQUFvQixtR0FBa0QsRUFBRSxDQUFDO2dCQUM5RSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUE7WUFDdkIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sZUFBZTtRQUN0QixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLG1HQUU5RCxDQUFBO1FBQ0QsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUVsRixJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ3BELElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUNoRCxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsU0FBUyxDQUFBO1lBQ2pELE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsQ0FBQztZQUMzQyxPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNyRCxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUNoRCxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQztnQkFDL0QsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTtZQUN4RixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7O0FBbkRXLHdDQUF3QztJQVNsRCxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQVhYLHdDQUF3QyxDQW9EcEQifQ==