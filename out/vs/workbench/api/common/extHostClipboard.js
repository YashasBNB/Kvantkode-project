/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MainContext } from './extHost.protocol.js';
export class ExtHostClipboard {
    constructor(mainContext) {
        const proxy = mainContext.getProxy(MainContext.MainThreadClipboard);
        this.value = Object.freeze({
            readText() {
                return proxy.$readText();
            },
            writeText(value) {
                return proxy.$writeText(value);
            },
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENsaXBib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RDbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFnQixXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUdqRSxNQUFNLE9BQU8sZ0JBQWdCO0lBRzVCLFlBQVksV0FBeUI7UUFDcEMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtRQUNuRSxJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDMUIsUUFBUTtnQkFDUCxPQUFPLEtBQUssQ0FBQyxTQUFTLEVBQUUsQ0FBQTtZQUN6QixDQUFDO1lBQ0QsU0FBUyxDQUFDLEtBQWE7Z0JBQ3RCLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQixDQUFDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=