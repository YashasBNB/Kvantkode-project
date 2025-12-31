/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const NODE_REMOTE_RESOURCE_IPC_METHOD_NAME = 'request';
export const NODE_REMOTE_RESOURCE_CHANNEL_NAME = 'remoteResourceHandler';
export class NodeRemoteResourceRouter {
    async routeCall(hub, command, arg) {
        if (command !== NODE_REMOTE_RESOURCE_IPC_METHOD_NAME) {
            throw new Error(`Call not found: ${command}`);
        }
        const uri = arg[0];
        if (uri?.authority) {
            const connection = hub.connections.find((c) => c.ctx === uri.authority);
            if (connection) {
                return connection;
            }
        }
        throw new Error(`Caller not found`);
    }
    routeEvent(_, event) {
        throw new Error(`Event not found: ${event}`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWxlY3Ryb25SZW1vdGVSZXNvdXJjZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvY29tbW9uL2VsZWN0cm9uUmVtb3RlUmVzb3VyY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLFNBQVMsQ0FBQTtBQUU3RCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyx1QkFBdUIsQ0FBQTtBQVF4RSxNQUFNLE9BQU8sd0JBQXdCO0lBQ3BDLEtBQUssQ0FBQyxTQUFTLENBQ2QsR0FBMkIsRUFDM0IsT0FBZSxFQUNmLEdBQVM7UUFFVCxJQUFJLE9BQU8sS0FBSyxvQ0FBb0MsRUFBRSxDQUFDO1lBQ3RELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDOUMsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQThCLENBQUE7UUFDL0MsSUFBSSxHQUFHLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDcEIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3ZFLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sVUFBVSxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBQ3BDLENBQUM7SUFFRCxVQUFVLENBQUMsQ0FBeUIsRUFBRSxLQUFhO1FBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDN0MsQ0FBQztDQUNEIn0=