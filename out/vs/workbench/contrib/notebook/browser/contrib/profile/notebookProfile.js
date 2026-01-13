/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { NotebookSetting } from '../../../common/notebookCommon.js';
export var NotebookProfileType;
(function (NotebookProfileType) {
    NotebookProfileType["default"] = "default";
    NotebookProfileType["jupyter"] = "jupyter";
    NotebookProfileType["colab"] = "colab";
})(NotebookProfileType || (NotebookProfileType = {}));
const profiles = {
    [NotebookProfileType.default]: {
        [NotebookSetting.focusIndicator]: 'gutter',
        [NotebookSetting.insertToolbarLocation]: 'both',
        [NotebookSetting.globalToolbar]: true,
        [NotebookSetting.cellToolbarLocation]: { default: 'right' },
        [NotebookSetting.compactView]: true,
        [NotebookSetting.showCellStatusBar]: 'visible',
        [NotebookSetting.consolidatedRunButton]: true,
        [NotebookSetting.undoRedoPerCell]: false,
    },
    [NotebookProfileType.jupyter]: {
        [NotebookSetting.focusIndicator]: 'gutter',
        [NotebookSetting.insertToolbarLocation]: 'notebookToolbar',
        [NotebookSetting.globalToolbar]: true,
        [NotebookSetting.cellToolbarLocation]: { default: 'left' },
        [NotebookSetting.compactView]: true,
        [NotebookSetting.showCellStatusBar]: 'visible',
        [NotebookSetting.consolidatedRunButton]: false,
        [NotebookSetting.undoRedoPerCell]: true,
    },
    [NotebookProfileType.colab]: {
        [NotebookSetting.focusIndicator]: 'border',
        [NotebookSetting.insertToolbarLocation]: 'betweenCells',
        [NotebookSetting.globalToolbar]: false,
        [NotebookSetting.cellToolbarLocation]: { default: 'right' },
        [NotebookSetting.compactView]: false,
        [NotebookSetting.showCellStatusBar]: 'hidden',
        [NotebookSetting.consolidatedRunButton]: true,
        [NotebookSetting.undoRedoPerCell]: false,
    },
};
async function applyProfile(configService, profile) {
    const promises = [];
    for (const settingKey in profile) {
        promises.push(configService.updateValue(settingKey, profile[settingKey]));
    }
    await Promise.all(promises);
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'notebook.setProfile',
            title: localize('setProfileTitle', 'Set Profile'),
        });
    }
    async run(accessor, args) {
        if (!isSetProfileArgs(args)) {
            return;
        }
        const configService = accessor.get(IConfigurationService);
        return applyProfile(configService, profiles[args.profile]);
    }
});
function isSetProfileArgs(args) {
    const setProfileArgs = args;
    return (setProfileArgs.profile === NotebookProfileType.colab ||
        setProfileArgs.profile === NotebookProfileType.default ||
        setProfileArgs.profile === NotebookProfileType.jupyter);
}
// export class NotebookProfileContribution extends Disposable {
// 	static readonly ID = 'workbench.contrib.notebookProfile';
// 	constructor(@IConfigurationService configService: IConfigurationService, @IWorkbenchAssignmentService private readonly experimentService: IWorkbenchAssignmentService) {
// 		super();
// 		if (this.experimentService) {
// 			this.experimentService.getTreatment<NotebookProfileType.default | NotebookProfileType.jupyter | NotebookProfileType.colab>('notebookprofile').then(treatment => {
// 				if (treatment === undefined) {
// 					return;
// 				} else {
// 					// check if settings are already modified
// 					const focusIndicator = configService.getValue(NotebookSetting.focusIndicator);
// 					const insertToolbarPosition = configService.getValue(NotebookSetting.insertToolbarLocation);
// 					const globalToolbar = configService.getValue(NotebookSetting.globalToolbar);
// 					// const cellToolbarLocation = configService.getValue(NotebookSetting.cellToolbarLocation);
// 					const compactView = configService.getValue(NotebookSetting.compactView);
// 					const showCellStatusBar = configService.getValue(NotebookSetting.showCellStatusBar);
// 					const consolidatedRunButton = configService.getValue(NotebookSetting.consolidatedRunButton);
// 					if (focusIndicator === 'border'
// 						&& insertToolbarPosition === 'both'
// 						&& globalToolbar === false
// 						// && cellToolbarLocation === undefined
// 						&& compactView === true
// 						&& showCellStatusBar === 'visible'
// 						&& consolidatedRunButton === true
// 					) {
// 						applyProfile(configService, profiles[treatment] ?? profiles[NotebookProfileType.default]);
// 					}
// 				}
// 			});
// 		}
// 	}
// }
// registerWorkbenchContribution2(NotebookProfileContribution.ID, NotebookProfileContribution, WorkbenchPhase.BlockRestore);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tQcm9maWxlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvcHJvZmlsZS9ub3RlYm9va1Byb2ZpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE1BQU0sQ0FBTixJQUFZLG1CQUlYO0FBSkQsV0FBWSxtQkFBbUI7SUFDOUIsMENBQW1CLENBQUE7SUFDbkIsMENBQW1CLENBQUE7SUFDbkIsc0NBQWUsQ0FBQTtBQUNoQixDQUFDLEVBSlcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQUk5QjtBQUVELE1BQU0sUUFBUSxHQUFHO0lBQ2hCLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDOUIsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUTtRQUMxQyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLE1BQU07UUFDL0MsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSTtRQUNyQyxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRTtRQUMzRCxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJO1FBQ25DLENBQUMsZUFBZSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsU0FBUztRQUM5QyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLElBQUk7UUFDN0MsQ0FBQyxlQUFlLENBQUMsZUFBZSxDQUFDLEVBQUUsS0FBSztLQUN4QztJQUNELENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDOUIsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUTtRQUMxQyxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLGlCQUFpQjtRQUMxRCxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRSxJQUFJO1FBQ3JDLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO1FBQzFELENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUk7UUFDbkMsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsRUFBRSxTQUFTO1FBQzlDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsS0FBSztRQUM5QyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxJQUFJO0tBQ3ZDO0lBQ0QsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUM1QixDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsRUFBRSxRQUFRO1FBQzFDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsY0FBYztRQUN2RCxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsRUFBRSxLQUFLO1FBQ3RDLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO1FBQzNELENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUs7UUFDcEMsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsRUFBRSxRQUFRO1FBQzdDLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsSUFBSTtRQUM3QyxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsRUFBRSxLQUFLO0tBQ3hDO0NBQ0QsQ0FBQTtBQUVELEtBQUssVUFBVSxZQUFZLENBQzFCLGFBQW9DLEVBQ3BDLE9BQTRCO0lBRTVCLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtJQUNuQixLQUFLLE1BQU0sVUFBVSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLENBQUM7QUFNRCxlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUJBQXFCO1lBQ3pCLEtBQUssRUFBRSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsYUFBYSxDQUFDO1NBQ2pELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBYTtRQUNsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN6RCxPQUFPLFlBQVksQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQzNELENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWE7SUFDdEMsTUFBTSxjQUFjLEdBQUcsSUFBdUIsQ0FBQTtJQUM5QyxPQUFPLENBQ04sY0FBYyxDQUFDLE9BQU8sS0FBSyxtQkFBbUIsQ0FBQyxLQUFLO1FBQ3BELGNBQWMsQ0FBQyxPQUFPLEtBQUssbUJBQW1CLENBQUMsT0FBTztRQUN0RCxjQUFjLENBQUMsT0FBTyxLQUFLLG1CQUFtQixDQUFDLE9BQU8sQ0FDdEQsQ0FBQTtBQUNGLENBQUM7QUFFRCxnRUFBZ0U7QUFFaEUsNkRBQTZEO0FBRTdELDRLQUE0SztBQUM1SyxhQUFhO0FBRWIsa0NBQWtDO0FBQ2xDLHVLQUF1SztBQUN2SyxxQ0FBcUM7QUFDckMsZUFBZTtBQUNmLGVBQWU7QUFDZixpREFBaUQ7QUFDakQsc0ZBQXNGO0FBQ3RGLG9HQUFvRztBQUNwRyxvRkFBb0Y7QUFDcEYsbUdBQW1HO0FBQ25HLGdGQUFnRjtBQUNoRiw0RkFBNEY7QUFDNUYsb0dBQW9HO0FBQ3BHLHVDQUF1QztBQUN2Qyw0Q0FBNEM7QUFDNUMsbUNBQW1DO0FBQ25DLGdEQUFnRDtBQUNoRCxnQ0FBZ0M7QUFDaEMsMkNBQTJDO0FBQzNDLDBDQUEwQztBQUMxQyxXQUFXO0FBQ1gsbUdBQW1HO0FBQ25HLFNBQVM7QUFDVCxRQUFRO0FBQ1IsU0FBUztBQUNULE1BQU07QUFDTixLQUFLO0FBQ0wsSUFBSTtBQUVKLDRIQUE0SCJ9