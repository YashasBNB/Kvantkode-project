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
import * as nls from '../../../../nls.js';
import * as path from '../../../../base/common/path.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
/**
 * Shows a message when opening a large file which has been memory optimized (and features disabled).
 */
let LargeFileOptimizationsWarner = class LargeFileOptimizationsWarner extends Disposable {
    static { this.ID = 'editor.contrib.largeFileOptimizationsWarner'; }
    constructor(_editor, _notificationService, _configurationService) {
        super();
        this._editor = _editor;
        this._notificationService = _notificationService;
        this._configurationService = _configurationService;
        this._register(this._editor.onDidChangeModel((e) => this._update()));
        this._update();
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        if (model.isTooLargeForTokenization()) {
            const message = nls.localize({
                key: 'largeFile',
                comment: ['Variable 0 will be a file name.'],
            }, '{0}: tokenization, wrapping, folding, codelens, word highlighting and sticky scroll have been turned off for this large file in order to reduce memory usage and avoid freezing or crashing.', path.basename(model.uri.path));
            this._notificationService.prompt(Severity.Info, message, [
                {
                    label: nls.localize('removeOptimizations', 'Forcefully Enable Features'),
                    run: () => {
                        this._configurationService.updateValue(`editor.largeFileOptimizations`, false).then(() => {
                            this._notificationService.info(nls.localize('reopenFilePrompt', 'Please reopen file in order for this setting to take effect.'));
                        }, (err) => {
                            this._notificationService.error(err);
                        });
                    },
                },
            ], { neverShowAgain: { id: 'editor.contrib.largeFileOptimizationsWarner' } });
        }
    }
};
LargeFileOptimizationsWarner = __decorate([
    __param(1, INotificationService),
    __param(2, IConfigurationService)
], LargeFileOptimizationsWarner);
export { LargeFileOptimizationsWarner };
registerEditorContribution(LargeFileOptimizationsWarner.ID, LargeFileOptimizationsWarner, 1 /* EditorContributionInstantiation.AfterFirstRender */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFyZ2VGaWxlT3B0aW1pemF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9sYXJnZUZpbGVPcHRpbWl6YXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBRXZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFFakU7O0dBRUc7QUFDSSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFHLDZDQUE2QyxBQUFoRCxDQUFnRDtJQUV6RSxZQUNrQixPQUFvQixFQUNFLG9CQUEwQyxFQUN6QyxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFKVSxZQUFPLEdBQVAsT0FBTyxDQUFhO1FBQ0UseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUN6QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSXBGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRU8sT0FBTztRQUNkLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDckMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLENBQUM7WUFDdkMsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FDM0I7Z0JBQ0MsR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLE9BQU8sRUFBRSxDQUFDLGlDQUFpQyxDQUFDO2FBQzVDLEVBQ0QsOExBQThMLEVBQzlMLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FDN0IsQ0FBQTtZQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQy9CLFFBQVEsQ0FBQyxJQUFJLEVBQ2IsT0FBTyxFQUNQO2dCQUNDO29CQUNDLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDRCQUE0QixDQUFDO29CQUN4RSxHQUFHLEVBQUUsR0FBRyxFQUFFO3dCQUNULElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUNsRixHQUFHLEVBQUU7NEJBQ0osSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FDN0IsR0FBRyxDQUFDLFFBQVEsQ0FDWCxrQkFBa0IsRUFDbEIsOERBQThELENBQzlELENBQ0QsQ0FBQTt3QkFDRixDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsRUFBRTs0QkFDUCxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUNyQyxDQUFDLENBQ0QsQ0FBQTtvQkFDRixDQUFDO2lCQUNEO2FBQ0QsRUFDRCxFQUFFLGNBQWMsRUFBRSxFQUFFLEVBQUUsRUFBRSw2Q0FBNkMsRUFBRSxFQUFFLENBQ3pFLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQzs7QUF4RFcsNEJBQTRCO0lBS3RDLFdBQUEsb0JBQW9CLENBQUE7SUFDcEIsV0FBQSxxQkFBcUIsQ0FBQTtHQU5YLDRCQUE0QixDQXlEeEM7O0FBRUQsMEJBQTBCLENBQ3pCLDRCQUE0QixDQUFDLEVBQUUsRUFDL0IsNEJBQTRCLDJEQUU1QixDQUFBIn0=