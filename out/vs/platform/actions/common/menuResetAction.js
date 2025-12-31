/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../nls.js';
import { Categories } from '../../action/common/actionCommonCategories.js';
import { Action2, IMenuService } from './actions.js';
import { ILogService } from '../../log/common/log.js';
export class MenuHiddenStatesReset extends Action2 {
    constructor() {
        super({
            id: 'menu.resetHiddenStates',
            title: localize2('title', 'Reset All Menus'),
            category: Categories.View,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IMenuService).resetHiddenStates();
        accessor.get(ILogService).info('did RESET all menu hidden states');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVJlc2V0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9jb21tb24vbWVudVJlc2V0QWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFFcEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXJELE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxPQUFPO0lBQ2pEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdCQUF3QjtZQUM1QixLQUFLLEVBQUUsU0FBUyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQztZQUM1QyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUk7WUFDekIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUM5QyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO0lBQ25FLENBQUM7Q0FDRCJ9