/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../base/common/network.js';
import { ExtUri } from '../../../base/common/resources.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostFileSystemInfo {
    constructor() {
        this._systemSchemes = new Set(Object.keys(Schemas));
        this._providerInfo = new Map();
        this.extUri = new ExtUri((uri) => {
            const capabilities = this._providerInfo.get(uri.scheme);
            if (capabilities === undefined) {
                // default: not ignore
                return false;
            }
            if (capabilities & 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */) {
                // configured as case sensitive
                return false;
            }
            return true;
        });
    }
    $acceptProviderInfos(uri, capabilities) {
        if (capabilities === null) {
            this._providerInfo.delete(uri.scheme);
        }
        else {
            this._providerInfo.set(uri.scheme, capabilities);
        }
    }
    isFreeScheme(scheme) {
        return !this._providerInfo.has(scheme) && !this._systemSchemes.has(scheme);
    }
    getCapabilities(scheme) {
        return this._providerInfo.get(scheme);
    }
}
export const IExtHostFileSystemInfo = createDecorator('IExtHostFileSystemInfo');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW1JbmZvLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEZpbGVTeXN0ZW1JbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sbUNBQW1DLENBQUE7QUFHbkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBR3pGLE1BQU0sT0FBTyxxQkFBcUI7SUFRakM7UUFMaUIsbUJBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDOUMsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQTtRQUt6RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDaEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZELElBQUksWUFBWSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxzQkFBc0I7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELElBQUksWUFBWSw4REFBbUQsRUFBRSxDQUFDO2dCQUNyRSwrQkFBK0I7Z0JBQy9CLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsR0FBa0IsRUFBRSxZQUEyQjtRQUNuRSxJQUFJLFlBQVksS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWM7UUFDMUIsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0UsQ0FBQztJQUVELGVBQWUsQ0FBQyxNQUFjO1FBQzdCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNEO0FBS0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQSJ9