/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as cookie from 'cookie';
import * as fs from 'fs';
import * as path from '../../base/common/path.js';
import { generateUuid } from '../../base/common/uuid.js';
import { connectionTokenCookieName, connectionTokenQueryName } from '../../base/common/network.js';
import { Promises } from '../../base/node/pfs.js';
const connectionTokenRegex = /^[0-9A-Za-z_-]+$/;
export var ServerConnectionTokenType;
(function (ServerConnectionTokenType) {
    ServerConnectionTokenType[ServerConnectionTokenType["None"] = 0] = "None";
    ServerConnectionTokenType[ServerConnectionTokenType["Optional"] = 1] = "Optional";
    ServerConnectionTokenType[ServerConnectionTokenType["Mandatory"] = 2] = "Mandatory";
})(ServerConnectionTokenType || (ServerConnectionTokenType = {}));
export class NoneServerConnectionToken {
    constructor() {
        this.type = 0 /* ServerConnectionTokenType.None */;
    }
    validate(connectionToken) {
        return true;
    }
}
export class MandatoryServerConnectionToken {
    constructor(value) {
        this.value = value;
        this.type = 2 /* ServerConnectionTokenType.Mandatory */;
    }
    validate(connectionToken) {
        return connectionToken === this.value;
    }
}
export class ServerConnectionTokenParseError {
    constructor(message) {
        this.message = message;
    }
}
export async function parseServerConnectionToken(args, defaultValue) {
    const withoutConnectionToken = args['without-connection-token'];
    const connectionToken = args['connection-token'];
    const connectionTokenFile = args['connection-token-file'];
    if (withoutConnectionToken) {
        if (typeof connectionToken !== 'undefined' || typeof connectionTokenFile !== 'undefined') {
            return new ServerConnectionTokenParseError(`Please do not use the argument '--connection-token' or '--connection-token-file' at the same time as '--without-connection-token'.`);
        }
        return new NoneServerConnectionToken();
    }
    if (typeof connectionTokenFile !== 'undefined') {
        if (typeof connectionToken !== 'undefined') {
            return new ServerConnectionTokenParseError(`Please do not use the argument '--connection-token' at the same time as '--connection-token-file'.`);
        }
        let rawConnectionToken;
        try {
            rawConnectionToken = fs
                .readFileSync(connectionTokenFile)
                .toString()
                .replace(/\r?\n$/, '');
        }
        catch (e) {
            return new ServerConnectionTokenParseError(`Unable to read the connection token file at '${connectionTokenFile}'.`);
        }
        if (!connectionTokenRegex.test(rawConnectionToken)) {
            return new ServerConnectionTokenParseError(`The connection token defined in '${connectionTokenFile} does not adhere to the characters 0-9, a-z, A-Z, _, or -.`);
        }
        return new MandatoryServerConnectionToken(rawConnectionToken);
    }
    if (typeof connectionToken !== 'undefined') {
        if (!connectionTokenRegex.test(connectionToken)) {
            return new ServerConnectionTokenParseError(`The connection token '${connectionToken} does not adhere to the characters 0-9, a-z, A-Z or -.`);
        }
        return new MandatoryServerConnectionToken(connectionToken);
    }
    return new MandatoryServerConnectionToken(await defaultValue());
}
export async function determineServerConnectionToken(args) {
    const readOrGenerateConnectionToken = async () => {
        if (!args['user-data-dir']) {
            // No place to store it!
            return generateUuid();
        }
        const storageLocation = path.join(args['user-data-dir'], 'token');
        // First try to find a connection token
        try {
            const fileContents = await fs.promises.readFile(storageLocation);
            const connectionToken = fileContents.toString().replace(/\r?\n$/, '');
            if (connectionTokenRegex.test(connectionToken)) {
                return connectionToken;
            }
        }
        catch (err) { }
        // No connection token found, generate one
        const connectionToken = generateUuid();
        try {
            // Try to store it
            await Promises.writeFile(storageLocation, connectionToken, { mode: 0o600 });
        }
        catch (err) { }
        return connectionToken;
    };
    return parseServerConnectionToken(args, readOrGenerateConnectionToken);
}
export function requestHasValidConnectionToken(connectionToken, req, parsedUrl) {
    // First check if there is a valid query parameter
    if (connectionToken.validate(parsedUrl.query[connectionTokenQueryName])) {
        return true;
    }
    // Otherwise, check if there is a valid cookie
    const cookies = cookie.parse(req.headers.cookie || '');
    return connectionToken.validate(cookies[connectionTokenCookieName]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9zZXJ2ZXIvbm9kZS9zZXJ2ZXJDb25uZWN0aW9uVG9rZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFHeEIsT0FBTyxLQUFLLElBQUksTUFBTSwyQkFBMkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDeEQsT0FBTyxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRWpELE1BQU0sb0JBQW9CLEdBQUcsa0JBQWtCLENBQUE7QUFFL0MsTUFBTSxDQUFOLElBQWtCLHlCQUlqQjtBQUpELFdBQWtCLHlCQUF5QjtJQUMxQyx5RUFBSSxDQUFBO0lBQ0osaUZBQVEsQ0FBQTtJQUNSLG1GQUFTLENBQUE7QUFDVixDQUFDLEVBSmlCLHlCQUF5QixLQUF6Qix5QkFBeUIsUUFJMUM7QUFFRCxNQUFNLE9BQU8seUJBQXlCO0lBQXRDO1FBQ2lCLFNBQUksMENBQWlDO0lBS3RELENBQUM7SUFITyxRQUFRLENBQUMsZUFBb0I7UUFDbkMsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sOEJBQThCO0lBRzFDLFlBQTRCLEtBQWE7UUFBYixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBRnpCLFNBQUksK0NBQXNDO0lBRWQsQ0FBQztJQUV0QyxRQUFRLENBQUMsZUFBb0I7UUFDbkMsT0FBTyxlQUFlLEtBQUssSUFB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