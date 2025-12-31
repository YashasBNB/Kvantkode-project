/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as net from 'net';
/**
 * Given a start point and a max number of retries, will find a port that
 * is openable. Will return 0 in case no free port can be found.
 */
export function findFreePort(startPort, giveUpAfter, timeout, stride = 1) {
    let done = false;
    return new Promise((resolve) => {
        const timeoutHandle = setTimeout(() => {
            if (!done) {
                done = true;
                return resolve(0);
            }
        }, timeout);
        doFindFreePort(startPort, giveUpAfter, stride, (port) => {
            if (!done) {
                done = true;
                clearTimeout(timeoutHandle);
                return resolve(port);
            }
        });
    });
}
function doFindFreePort(startPort, giveUpAfter, stride, clb) {
    if (giveUpAfter === 0) {
        return clb(0);
    }
    const client = new net.Socket();
    // If we can connect to the port it means the port is already taken so we continue searching
    client.once('connect', () => {
        dispose(client);
        return doFindFreePort(startPort + stride, giveUpAfter - 1, stride, clb);
    });
    client.once('data', () => {
        // this listener is required since node.js 8.x
    });
    client.once('error', (err) => {
        dispose(client);
        // If we receive any non ECONNREFUSED error, it means the port is used but we cannot connect
        if (err.code !== 'ECONNREFUSED') {
            return doFindFreePort(startPort + stride, giveUpAfter - 1, stride, clb);
        }
        // Otherwise it means the port is free to use!
        return clb(startPort);
    });
    client.connect(startPort, '127.0.0.1');
}
// Reference: https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/net/base/port_util.cc#56
export const BROWSER_RESTRICTED_PORTS = {
    1: true, // tcpmux
    7: true, // echo
    9: true, // discard
    11: true, // systat
    13: true, // daytime
    15: true, // netstat
    17: true, // qotd
    19: true, // chargen
    20: true, // ftp data
    21: true, // ftp access
    22: true, // ssh
    23: true, // telnet
    25: true, // smtp
    37: true, // time
    42: true, // name
    43: true, // nicname
    53: true, // domain
    69: true, // tftp
    77: true, // priv-rjs
    79: true, // finger
    87: true, // ttylink
    95: true, // supdup
    101: true, // hostriame
    102: true, // iso-tsap
    103: true, // gppitnp
    104: true, // acr-nema
    109: true, // pop2
    110: true, // pop3
    111: true, // sunrpc
    113: true, // auth
    115: true, // sftp
    117: true, // uucp-path
    119: true, // nntp
    123: true, // NTP
    135: true, // loc-srv /epmap
    137: true, // netbios
    139: true, // netbios
    143: true, // imap2
    161: true, // snmp
    179: true, // BGP
    389: true, // ldap
    427: true, // SLP (Also used by Apple Filing Protocol)
    465: true, // smtp+ssl
    512: true, // print / exec
    513: true, // login
    514: true, // shell
    515: true, // printer
    526: true, // tempo
    530: true, // courier
    531: true, // chat
    532: true, // netnews
    540: true, // uucp
    548: true, // AFP (Apple Filing Protocol)
    554: true, // rtsp
    556: true, // remotefs
    563: true, // nntp+ssl
    587: true, // smtp (rfc6409)
    601: true, // syslog-conn (rfc3195)
    636: true, // ldap+ssl
    989: true, // ftps-data
    990: true, // ftps
    993: true, // ldap+ssl
    995: true, // pop3+ssl
    1719: true, // h323gatestat
    1720: true, // h323hostcall
    1723: true, // pptp
    2049: true, // nfs
    3659: true, // apple-sasl / PasswordServer
    4045: true, // lockd
    5060: true, // sip
    5061: true, // sips
    6000: true, // X11
    6566: true, // sane-port
    6665: true, // Alternate IRC [Apple addition]
    6666: true, // Alternate IRC [Apple addition]
    6667: true, // Standard IRC [Apple addition]
    6668: true, // Alternate IRC [Apple addition]
    6669: true, // Alternate IRC [Apple addition]
    6697: true, // IRC + TLS
    10080: true, // Amanda
};
/**
 * Uses listen instead of connect. Is faster, but if there is another listener on 0.0.0.0 then this will take 127.0.0.1 from that listener.
 */
export function findFreePortFaster(startPort, giveUpAfter, timeout, hostname = '127.0.0.1') {
    let resolved = false;
    let timeoutHandle = undefined;
    let countTried = 1;
    const server = net.createServer({ pauseOnConnect: true });
    function doResolve(port, resolve) {
        if (!resolved) {
            resolved = true;
            server.removeAllListeners();
            server.close();
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            resolve(port);
        }
    }
    return new Promise((resolve) => {
        timeoutHandle = setTimeout(() => {
            doResolve(0, resolve);
        }, timeout);
        server.on('listening', () => {
            doResolve(startPort, resolve);
        });
        server.on('error', (err) => {
            if (err &&
                (err.code === 'EADDRINUSE' || err.code === 'EACCES') &&
                countTried < giveUpAfter) {
                startPort++;
                countTried++;
                server.listen(startPort, hostname);
            }
            else {
                doResolve(0, resolve);
            }
        });
        server.on('close', () => {
            doResolve(0, resolve);
        });
        server.listen(startPort, hostname);
    });
}
function dispose(socket) {
    try {
        socket.removeAllListeners('connect');
        socket.removeAllListeners('error');
        socket.end();
        socket.destroy();
        socket.unref();
    }
    catch (error) {
        console.error(error); // otherwise this error would get lost in the callback chain
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL25vZGUvcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFFMUI7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FDM0IsU0FBaUIsRUFDakIsV0FBbUIsRUFDbkIsT0FBZSxFQUNmLE1BQU0sR0FBRyxDQUFDO0lBRVYsSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFBO0lBRWhCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3JDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDWCxJQUFJLEdBQUcsSUFBSSxDQUFBO2dCQUNYLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2xCLENBQUM7UUFDRixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFWCxjQUFjLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN2RCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDWCxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBQzNCLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3JCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUN0QixTQUFpQixFQUNqQixXQUFtQixFQUNuQixNQUFjLEVBQ2QsR0FBMkI7SUFFM0IsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDdkIsT0FBTyxH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