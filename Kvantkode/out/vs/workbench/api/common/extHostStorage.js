/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
import { Emitter } from '../../../base/common/event.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
export class ExtHostStorage {
    constructor(mainContext, _logService) {
        this._logService = _logService;
        this._onDidChangeStorage = new Emitter();
        this.onDidChangeStorage = this._onDidChangeStorage.event;
        this._proxy = mainContext.getProxy(MainContext.MainThreadStorage);
    }
    registerExtensionStorageKeysToSync(extension, keys) {
        this._proxy.$registerExtensionStorageKeysToSync(extension, keys);
    }
    async initializeExtensionStorage(shared, key, defaultValue) {
        const value = await this._proxy.$initializeExtensionStorage(shared, key);
        let parsedValue;
        if (value) {
            parsedValue = this.safeParseValue(shared, key, value);
        }
        return parsedValue || defaultValue;
    }
    setValue(shared, key, value) {
        return this._proxy.$setValue(shared, key, value);
    }
    $acceptValue(shared, key, value) {
        const parsedValue = this.safeParseValue(shared, key, value);
        if (parsedValue) {
            this._onDidChangeStorage.fire({ shared, key, value: parsedValue });
        }
    }
    safeParseValue(shared, key, value) {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            // Do not fail this call but log it for diagnostics
            // https://github.com/microsoft/vscode/issues/132777
            this._logService.error(`[extHostStorage] unexpected error parsing storage contents (extensionId: ${key}, global: ${shared}): ${error}`);
        }
        return undefined;
    }
}
export const IExtHostStorage = createDecorator('IExtHostStorage');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQStDLE1BQU0sdUJBQXVCLENBQUE7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQVV6RixNQUFNLE9BQU8sY0FBYztJQVExQixZQUNDLFdBQStCLEVBQ2QsV0FBd0I7UUFBeEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFMekIsd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUE7UUFDaEUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQU0zRCxJQUFJLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVELGtDQUFrQyxDQUFDLFNBQWtDLEVBQUUsSUFBYztRQUNwRixJQUFJLENBQUMsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUNqRSxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUMvQixNQUFlLEVBQ2YsR0FBVyxFQUNYLFlBQXFCO1FBRXJCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFeEUsSUFBSSxXQUErQixDQUFBO1FBQ25DLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RELENBQUM7UUFFRCxPQUFPLFdBQVcsSUFBSSxZQUFZLENBQUE7SUFDbkMsQ0FBQztJQUVELFFBQVEsQ0FBQyxNQUFlLEVBQUUsR0FBVyxFQUFFLEtBQWE7UUFDbkQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxZQUFZLENBQUMsTUFBZSxFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ3ZELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO1FBQ25FLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQWUsRUFBRSxHQUFXLEVBQUUsS0FBYTtRQUNqRSxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsbURBQW1EO1lBQ25ELG9EQUFvRDtZQUNwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FDckIsNEVBQTRFLEdBQUcsYUFBYSxNQUFNLE1BQU0sS0FBSyxFQUFFLENBQy9HLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNEO0FBR0QsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsaUJBQWlCLENBQUMsQ0FBQSJ9