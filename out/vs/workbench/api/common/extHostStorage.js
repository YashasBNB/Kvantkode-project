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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0U3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUErQyxNQUFNLHVCQUF1QixDQUFBO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFVekYsTUFBTSxPQUFPLGNBQWM7SUFRMUIsWUFDQyxXQUErQixFQUNkLFdBQXdCO1FBQXhCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBTHpCLHdCQUFtQixHQUFHLElBQUksT0FBTyxFQUF1QixDQUFBO1FBQ2hFLHVCQUFrQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUE7UUFNM0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxTQUFrQyxFQUFFLElBQWM7UUFDcEYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakUsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FDL0IsTUFBZSxFQUNmLEdBQVcsRUFDWCxZQUFxQjtRQUVyQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRXhFLElBQUksV0FBK0IsQ0FBQTtRQUNuQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsV0FBVyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxDQUFDO1FBRUQsT0FBTyxXQUFXLElBQUksWUFBWSxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBZSxFQUFFLEdBQVcsRUFBRSxLQUFhO1FBQ25ELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWUsRUFBRSxHQUFXLEVBQUUsS0FBYTtRQUN2RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDM0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQTtRQUNuRSxDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxNQUFlLEVBQUUsR0FBVyxFQUFFLEtBQWE7UUFDakUsSUFBSSxDQUFDO1lBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3pCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLG1EQUFtRDtZQUNuRCxvREFBb0Q7WUFDcEQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQ3JCLDRFQUE0RSxHQUFHLGFBQWEsTUFBTSxNQUFNLEtBQUssRUFBRSxDQUMvRyxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7Q0FDRDtBQUdELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGlCQUFpQixDQUFDLENBQUEifQ==