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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyQ29ubmVjdGlvblRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvc2VydmVyQ29ubmVjdGlvblRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBR3hCLE9BQU8sS0FBSyxJQUFJLE1BQU0sMkJBQTJCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWxHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVqRCxNQUFNLG9CQUFvQixHQUFHLGtCQUFrQixDQUFBO0FBRS9DLE1BQU0sQ0FBTixJQUFrQix5QkFJakI7QUFKRCxXQUFrQix5QkFBeUI7SUFDMUMseUVBQUksQ0FBQTtJQUNKLGlGQUFRLENBQUE7SUFDUixtRkFBUyxDQUFBO0FBQ1YsQ0FBQyxFQUppQix5QkFBeUIsS0FBekIseUJBQXlCLFFBSTFDO0FBRUQsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQUNpQixTQUFJLDBDQUFpQztJQUt0RCxDQUFDO0lBSE8sUUFBUSxDQUFDLGVBQW9CO1FBQ25DLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDhCQUE4QjtJQUcxQyxZQUE0QixLQUFhO1FBQWIsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUZ6QixTQUFJLCtDQUFzQztJQUVkLENBQUM7SUFFdEMsUUFBUSxDQUFDLGVBQW9CO1FBQ25DLE9BQU8sZUFBZSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUE7SUFDdEMs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