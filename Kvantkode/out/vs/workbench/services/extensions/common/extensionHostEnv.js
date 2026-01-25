/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ExtHostConnectionType;
(function (ExtHostConnectionType) {
    ExtHostConnectionType[ExtHostConnectionType["IPC"] = 1] = "IPC";
    ExtHostConnectionType[ExtHostConnectionType["Socket"] = 2] = "Socket";
    ExtHostConnectionType[ExtHostConnectionType["MessagePort"] = 3] = "MessagePort";
})(ExtHostConnectionType || (ExtHostConnectionType = {}));
/**
 * The extension host will connect via named pipe / domain socket to its renderer.
 */
export class IPCExtHostConnection {
    static { this.ENV_KEY = 'VSCODE_EXTHOST_IPC_HOOK'; }
    constructor(pipeName) {
        this.pipeName = pipeName;
        this.type = 1 /* ExtHostConnectionType.IPC */;
    }
    serialize(env) {
        env[IPCExtHostConnection.ENV_KEY] = this.pipeName;
    }
}
/**
 * The extension host will receive via nodejs IPC the socket to its renderer.
 */
export class SocketExtHostConnection {
    constructor() {
        this.type = 2 /* ExtHostConnectionType.Socket */;
    }
    static { this.ENV_KEY = 'VSCODE_EXTHOST_WILL_SEND_SOCKET'; }
    serialize(env) {
        env[SocketExtHostConnection.ENV_KEY] = '1';
    }
}
/**
 * The extension host will receive via nodejs IPC the MessagePort to its renderer.
 */
export class MessagePortExtHostConnection {
    constructor() {
        this.type = 3 /* ExtHostConnectionType.MessagePort */;
    }
    static { this.ENV_KEY = 'VSCODE_WILL_SEND_MESSAGE_PORT'; }
    serialize(env) {
        env[MessagePortExtHostConnection.ENV_KEY] = '1';
    }
}
function clean(env) {
    delete env[IPCExtHostConnection.ENV_KEY];
    delete env[SocketExtHostConnection.ENV_KEY];
    delete env[MessagePortExtHostConnection.ENV_KEY];
}
/**
 * Write `connection` into `env` and clean up `env`.
 */
export function writeExtHostConnection(connection, env) {
    // Avoid having two different keys that might introduce amiguity or problems.
    clean(env);
    connection.serialize(env);
}
/**
 * Read `connection` from `env` and clean up `env`.
 */
export function readExtHostConnection(env) {
    if (env[IPCExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new IPCExtHostConnection(env[IPCExtHostConnection.ENV_KEY]));
    }
    if (env[SocketExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new SocketExtHostConnection());
    }
    if (env[MessagePortExtHostConnection.ENV_KEY]) {
        return cleanAndReturn(env, new MessagePortExtHostConnection());
    }
    throw new Error(`No connection information defined in environment!`);
}
function cleanAndReturn(env, result) {
    clean(env);
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uSG9zdEVudi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbkhvc3RFbnYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsTUFBTSxDQUFOLElBQWtCLHFCQUlqQjtBQUpELFdBQWtCLHFCQUFxQjtJQUN0QywrREFBTyxDQUFBO0lBQ1AscUVBQVUsQ0FBQTtJQUNWLCtFQUFlLENBQUE7QUFDaEIsQ0FBQyxFQUppQixxQkFBcUIsS0FBckIscUJBQXFCLFFBSXRDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sb0JBQW9CO2FBQ2xCLFlBQU8sR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7SUFJakQsWUFBNEIsUUFBZ0I7UUFBaEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtRQUY1QixTQUFJLHFDQUE0QjtJQUVELENBQUM7SUFFekMsU0FBUyxDQUFDLEdBQXdCO1FBQ3hDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFBO0lBQ2xELENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO0lBQXBDO1FBR2lCLFNBQUksd0NBQStCO0lBS3BELENBQUM7YUFQYyxZQUFPLEdBQUcsaUNBQWlDLEFBQXBDLENBQW9DO0lBSWxELFNBQVMsQ0FBQyxHQUF3QjtRQUN4QyxHQUFHLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFBO0lBQzNDLENBQUM7O0FBR0Y7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBR2lCLFNBQUksNkNBQW9DO0lBS3pELENBQUM7YUFQYyxZQUFPLEdBQUcsK0JBQStCLEFBQWxDLENBQWtDO0lBSWhELFNBQVMsQ0FBQyxHQUF3QjtRQUN4QyxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFBO0lBQ2hELENBQUM7O0FBUUYsU0FBUyxLQUFLLENBQUMsR0FBd0I7SUFDdEMsT0FBTyxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDeEMsT0FBTyxHQUFHLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0MsT0FBTyxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUNyQyxVQUE2QixFQUM3QixHQUF3QjtJQUV4Qiw2RUFBNkU7SUFDN0UsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1YsVUFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUMxQixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsR0FBd0I7SUFDN0QsSUFBSSxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUN2QyxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pGLENBQUM7SUFDRCxJQUFJLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQzFDLE9BQU8sY0FBYyxDQUFDLEdBQUcsRUFBRSxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBQ0QsSUFBSSxHQUFHLENBQUMsNEJBQTRCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUMvQyxPQUFPLGNBQWMsQ0FBQyxHQUFHLEVBQUUsSUFBSSw0QkFBNEIsRUFBRSxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsbURBQW1ELENBQUMsQ0FBQTtBQUNyRSxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsR0FBd0IsRUFBRSxNQUF5QjtJQUMxRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDVixPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMifQ==