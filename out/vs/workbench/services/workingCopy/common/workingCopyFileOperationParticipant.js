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
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
let WorkingCopyFileOperationParticipant = class WorkingCopyFileOperationParticipant extends Disposable {
    constructor(logService, configurationService) {
        super();
        this.logService = logService;
        this.configurationService = configurationService;
        this.participants = new LinkedList();
    }
    addFileOperationParticipant(participant) {
        const remove = this.participants.push(participant);
        return toDisposable(() => remove());
    }
    async participate(files, operation, undoInfo, token) {
        const timeout = this.configurationService.getValue('files.participants.timeout');
        if (typeof timeout !== 'number' || timeout <= 0) {
            return; // disabled
        }
        // For each participant
        for (const participant of this.participants) {
            try {
                await participant.participate(files, operation, undoInfo, timeout, token);
            }
            catch (err) {
                this.logService.warn(err);
            }
        }
    }
    dispose() {
        this.participants.clear();
        super.dispose();
    }
};
WorkingCopyFileOperationParticipant = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], WorkingCopyFileOperationParticipant);
export { WorkingCopyFileOperationParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlGaWxlT3BlcmF0aW9uUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5RmlsZU9wZXJhdGlvblBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQWUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBTzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUzRCxJQUFNLG1DQUFtQyxHQUF6QyxNQUFNLG1DQUFvQyxTQUFRLFVBQVU7SUFHbEUsWUFDYyxVQUF3QyxFQUM5QixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNiLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFKbkUsaUJBQVksR0FBRyxJQUFJLFVBQVUsRUFBd0MsQ0FBQTtJQU90RixDQUFDO0lBRUQsMkJBQTJCLENBQUMsV0FBaUQ7UUFDNUUsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUE7UUFFbEQsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FDaEIsS0FBeUIsRUFDekIsU0FBd0IsRUFDeEIsUUFBZ0QsRUFDaEQsS0FBd0I7UUFFeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBUyw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3hGLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxPQUFNLENBQUMsV0FBVztRQUNuQixDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQztnQkFDSixNQUFNLFdBQVcsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQzFFLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzFCLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVRLE9BQU87UUFDZixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRXpCLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQTFDWSxtQ0FBbUM7SUFJN0MsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0dBTFgsbUNBQW1DLENBMEMvQyJ9