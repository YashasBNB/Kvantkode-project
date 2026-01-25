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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmVsZWN0cm9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy9jb21tb24vaXBjLmVsZWN0cm9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sUUFBUTtJQUNwQixZQUNTLE1BQWMsRUFDYixTQUEwQjtRQUQzQixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2IsY0FBUyxHQUFULFNBQVMsQ0FBaUI7SUFDakMsQ0FBQztJQUVKLElBQUksQ0FBQyxPQUFpQjtRQUNyQixJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkQsQ0FBQztRQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDWix5QkFBeUI7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFFRCxVQUFVO1FBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNEIn0=