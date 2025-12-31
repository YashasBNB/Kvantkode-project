/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { homedir } from 'os';
import { platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
export class NativeMcpDiscoveryHelperService {
    constructor() { }
    load() {
        return Promise.resolve({
            platform,
            homedir: URI.file(homedir()),
            winAppData: this.uriFromEnvVariable('APPDATA'),
            xdgHome: this.uriFromEnvVariable('XDG_CONFIG_HOME'),
        });
    }
    uriFromEnvVariable(varName) {
        const envVar = process.env[varName];
        if (!envVar) {
            return undefined;
        }
        return URI.file(envVar);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTWNwRGlzY292ZXJ5SGVscGVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9ub2RlL25hdGl2ZU1jcERpc2NvdmVyeUhlbHBlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUM1QixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBTWpELE1BQU0sT0FBTywrQkFBK0I7SUFHM0MsZ0JBQWUsQ0FBQztJQUVoQixJQUFJO1FBQ0gsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3RCLFFBQVE7WUFDUixPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUM1QixVQUFVLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQztZQUM5QyxPQUFPLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGlCQUFpQixDQUFDO1NBQ25ELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUFlO1FBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN4QixDQUFDO0NBQ0QifQ==