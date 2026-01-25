var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { localize } from '../../../../nls.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IIssueFormService } from '../common/issue.js';
import { BaseIssueReporterService } from './baseIssueReporterService.js';
// GitHub has let us know that we could up our limit here to 8k. We chose 7500 to play it safe.
// ref https://github.com/microsoft/vscode/issues/159191
let IssueWebReporter = class IssueWebReporter extends BaseIssueReporterService {
    constructor(disableExtensions, data, os, product, window, issueFormService, themeService, fileService, fileDialogService) {
        super(disableExtensions, data, os, product, window, true, issueFormService, themeService, fileService, fileDialogService);
        const target = this.window.document.querySelector('.block-system .block-info');
        const webInfo = this.window.navigator.userAgent;
        if (webInfo) {
            target?.appendChild(this.window.document.createTextNode(webInfo));
            this.receivedSystemInfo = true;
            this.issueReporterModel.update({ systemInfoWeb: webInfo });
        }
        this.setEventHandlers();
    }
    setEventHandlers() {
        super.setEventHandlers();
        this.addEventListener('issue-type', 'change', (event) => {
            const issueType = parseInt(event.target.value);
            this.issueReporterModel.update({ issueType: issueType });
            // Resets placeholder
            const descriptionTextArea = this.getElementById('issue-title');
            if (descriptionTextArea) {
                descriptionTextArea.placeholder = localize('undefinedPlaceholder', 'Please enter a title');
            }
            this.updatePreviewButtonState();
            this.setSourceOptions();
            this.render();
        });
    }
};
IssueWebReporter = __decorate([
    __param(5, IIssueFormService),
    __param(6, IThemeService),
    __param(7, IFileService),
    __param(8, IFileDialogService)
], IssueWebReporter);
export { IssueWebReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVSZXBvcnRlclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVSZXBvcnRlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBS0EsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLG9CQUFvQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXhFLCtGQUErRjtBQUMvRix3REFBd0Q7QUFFakQsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSx3QkFBd0I7SUFDN0QsWUFDQyxpQkFBMEIsRUFDMUIsSUFBdUIsRUFDdkIsRUFJQyxFQUNELE9BQThCLEVBQzlCLE1BQWMsRUFDSyxnQkFBbUMsRUFDdkMsWUFBMkIsRUFDNUIsV0FBeUIsRUFDbkIsaUJBQXFDO1FBRXpELEtBQUssQ0FDSixpQkFBaUIsRUFDakIsSUFBSSxFQUNKLEVBQUUsRUFDRixPQUFPLEVBQ1AsTUFBTSxFQUNOLElBQUksRUFDSixnQkFBZ0IsRUFDaEIsWUFBWSxFQUNaLFdBQVcsRUFDWCxpQkFBaUIsQ0FDakIsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBYywyQkFBMkIsQ0FBQyxDQUFBO1FBRTNGLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQTtRQUMvQyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsTUFBTSxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtZQUNqRSxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1lBQzlCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUMzRCxDQUFDO1FBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7SUFDeEIsQ0FBQztJQUVlLGdCQUFnQjtRQUMvQixLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUV4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQVksRUFBRSxFQUFFO1lBQzlELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBb0IsS0FBSyxDQUFDLE1BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNsRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7WUFFeEQscUJBQXFCO1lBQ3JCLE1BQU0sbUJBQW1CLEdBQXFCLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDaEYsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixtQkFBbUIsQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLENBQUE7WUFDM0YsQ0FBQztZQUVELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO1lBQy9CLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUEzRFksZ0JBQWdCO0lBVzFCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsa0JBQWtCLENBQUE7R0FkUixnQkFBZ0IsQ0EyRDVCIn0=