/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * The Electron `Protocol` leverages Electron style IPC communication (`ipcRenderer`, `ipcMain`)
 * for the implementation of the `IMessagePassingProtocol`. That style of API requires a channel
 * name for sending data.
 */
export class Protocol {
    constructor(sender, onMessage) {
        this.sender = sender;
        this.onMessage = onMessage;
    }
    send(message) {
        try {
            this.sender.send('vscode:message', message.buffer);
        }
        catch (e) {
            // systems are going down
        }
    }
    disconnect() {
        this.sender.send('vscode:disconnect', null);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvY29tbW9uL2lwYy5lbGVjdHJvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRzs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLFFBQVE7SUFDcEIsWUFDUyxNQUFjLEVBQ2IsU0FBMEI7UUFEM0IsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNiLGNBQVMsR0FBVCxTQUFTLENBQWlCO0lBQ2pDLENBQUM7SUFFSixJQUFJLENBQUMsT0FBaUI7UUFDckIsSUFBSSxDQUFDO1lBQ0osSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ25ELENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1oseUJBQXlCO1FBQzFCLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRCJ9