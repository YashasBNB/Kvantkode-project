/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir, tmpdir } from 'os';
import { AbstractNativeEnvironmentService, parseDebugParams } from '../common/environmentService.js';
import { getUserDataPath } from './userDataPath.js';
export class NativeEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(args, productService) {
        super(args, {
            homeDir: homedir(),
            tmpDir: tmpdir(),
            userDataDir: getUserDataPath(args, productService.nameShort),
        }, productService);
    }
}
export function parsePtyHostDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-ptyhost'], args['inspect-brk-ptyhost'], 5877, isBuilt, args.extensionEnvironment);
}
export function parseSharedProcessDebugPort(args, isBuilt) {
    return parseDebugParams(args['inspect-sharedprocess'], args['inspect-brk-sharedprocess'], 5879, isBuilt, args.extensionEnvironment);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC9ub2RlL2Vudmlyb25tZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUdwQyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFHbkQsTUFBTSxPQUFPLHdCQUF5QixTQUFRLGdDQUFnQztJQUM3RSxZQUFZLElBQXNCLEVBQUUsY0FBK0I7UUFDbEUsS0FBSyxDQUNKLElBQUksRUFDSjtZQUNDLE9BQU8sRUFBRSxPQUFPLEVBQUU7WUFDbEIsTUFBTSxFQUFFLE1BQU0sRUFBRTtZQUNoQixXQUFXLEVBQUUsZUFBZSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFDO1NBQzVELEVBQ0QsY0FBYyxDQUNkLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsSUFBc0IsRUFBRSxPQUFnQjtJQUM3RSxPQUFPLGdCQUFnQixDQUN0QixJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFDdkIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEVBQzNCLElBQUksRUFDSixPQUFPLEVBQ1AsSUFBSSxDQUFDLG9CQUFvQixDQUN6QixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSwyQkFBMkIsQ0FDMUMsSUFBc0IsRUFDdEIsT0FBZ0I7SUFFaEIsT0FBTyxnQkFBZ0IsQ0FDdEIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEVBQzdCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxFQUNqQyxJQUFJLEVBQ0osT0FBTyxFQUNQLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQTtBQUNGLENBQUMifQ==