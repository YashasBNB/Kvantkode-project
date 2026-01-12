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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENsaXBib2FyZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENsaXBib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWdCLFdBQVcsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBR2pFLE1BQU0sT0FBTyxnQkFBZ0I7SUFHNUIsWUFBWSxXQUF5QjtRQUNwQyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ25FLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMxQixRQUFRO2dCQUNQLE9BQU8sS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQ3pCLENBQUM7WUFDRCxTQUFTLENBQUMsS0FBYTtnQkFDdEIsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9CLENBQUM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==