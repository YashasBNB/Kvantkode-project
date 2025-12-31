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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZW52aXJvbm1lbnQvbm9kZS9lbnZpcm9ubWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFHcEMsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBR25ELE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxnQ0FBZ0M7SUFDN0UsWUFBWSxJQUFzQixFQUFFLGNBQStCO1FBQ2xFLEtBQUssQ0FDSixJQUFJLEVBQ0o7WUFDQyxPQUFPLEVBQUUsT0FBTyxFQUFFO1lBQ2xCLE1BQU0sRUFBRSxNQUFNLEVBQUU7WUFDaEIsV0FBVyxFQUFFLGVBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLFNBQVMsQ0FBQztTQUM1RCxFQUNELGNBQWMsQ0FDZCxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLElBQXNCLEVBQUUsT0FBZ0I7SUFDN0UsT0FBTyxnQkFBZ0IsQ0FDdEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQ3ZCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxFQUMzQixJQUFJLEVBQ0osT0FBTyxFQUNQLElBQUksQ0FBQyxvQkFBb0IsQ0FDekIsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQzFDLElBQXNCLEVBQ3RCLE9BQWdCO0lBRWhCLE9BQU8sZ0JBQWdCLENBQ3RCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxFQUM3QixJQUFJLENBQUMsMkJBQTJCLENBQUMsRUFDakMsSUFBSSxFQUNKLE9BQU8sRUFDUCxJQUFJLENBQUMsb0JBQW9CLENBQ3pCLENBQUE7QUFDRixDQUFDIn0=