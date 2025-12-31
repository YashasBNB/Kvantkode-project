/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as net from 'net';
import { NodeSocket } from '../../../base/parts/ipc/node/ipc.net.js';
import { makeRawSocketHeaders } from '../common/managedSocket.js';
export const nodeSocketFactory = new (class {
    supports(connectTo) {
        return true;
    }
    connect({ host, port }, path, query, debugLabel) {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection({ host: host, port: port }, () => {
                socket.removeListener('error', reject);
                socket.write(makeRawSocketHeaders(path, query, debugLabel));
                const onData = (data) => {
                    const strData = data.toString();
                    if (strData.indexOf('\r\n\r\n') >= 0) {
                        // headers received OK
                        socket.off('data', onData);
                        resolve(new NodeSocket(socket, debugLabel));
                    }
                };
                socket.on('data', onData);
            });
            // Disable Nagle's algorithm.
            socket.setNoDelay(true);
            socket.once('error', reject);
        });
    }
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVNvY2tldEZhY3RvcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZW1vdGUvbm9kZS9ub2RlU29ja2V0RmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUUxQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFPakUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDO0lBR3JDLFFBQVEsQ0FBQyxTQUFvQztRQUM1QyxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxPQUFPLENBQ04sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUE2QixFQUN6QyxJQUFZLEVBQ1osS0FBYSxFQUNiLFVBQWtCO1FBRWxCLE9BQU8sSUFBSSxPQUFPLENBQVUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFO2dCQUNwRSxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtnQkFFdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7Z0JBRTNELE1BQU0sTUFBTSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7b0JBQy9CLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtvQkFDL0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3dCQUN0QyxzQkFBc0I7d0JBQ3RCLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO3dCQUMxQixPQUFPLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUE7b0JBQzVDLENBQUM7Z0JBQ0YsQ0FBQyxDQUFBO2dCQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQyxDQUFBO1lBQ0YsNkJBQTZCO1lBQzdCLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDdkIsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDN0IsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQyxFQUFFLENBQUEifQ==