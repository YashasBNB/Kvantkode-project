/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export const IShellEnvironmentService = createDecorator('shellEnvironmentService');
export class ShellEnvironmentService {
    getShellEnv() {
        return process.shellEnv();
    }
}
registerSingleton(IShellEnvironmentService, ShellEnvironmentService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxFbnZpcm9ubWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZW52aXJvbm1lbnQvZWxlY3Ryb24tc2FuZGJveC9zaGVsbEVudmlyb25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3BGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUVoRSxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FDcEMsZUFBZSxDQUEyQix5QkFBeUIsQ0FBQyxDQUFBO0FBUXJFLE1BQU0sT0FBTyx1QkFBdUI7SUFHbkMsV0FBVztRQUNWLE9BQU8sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQzFCLENBQUM7Q0FDRDtBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQSJ9