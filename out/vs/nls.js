/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line local/code-import-patterns
import { getNLSLanguage, getNLSMessages } from './nls.messages.js';
// eslint-disable-next-line local/code-import-patterns
export { getNLSLanguage, getNLSMessages } from './nls.messages.js';
const isPseudo = getNLSLanguage() === 'pseudo' ||
    (typeof document !== 'undefined' &&
        document.location &&
        typeof document.location.hash === 'string' &&
        document.location.hash.indexOf('pseudo=true') >= 0);
function _format(message, args) {
    let result;
    if (args.length === 0) {
        result = message;
    }
    else {
        result = message.replace(/\{(\d+)\}/g, (match, rest) => {
            const index = rest[0];
            const arg = args[index];
            let result = match;
            if (typeof arg === 'string') {
                result = arg;
            }
            else if (typeof arg === 'number' ||
                typeof arg === 'boolean' ||
                arg === void 0 ||
                arg === null) {
                result = String(arg);
            }
            return result;
        });
    }
    if (isPseudo) {
        // FF3B and FF3D is the Unicode zenkaku representation for [ and ]
        result = '\uFF3B' + result.replace(/[aouei]/g, '$&$&') + '\uFF3D';
    }
    return result;
}
/**
 * @skipMangle
 */
export function localize(data /* | number when built */, message /* | null when built */, ...args) {
    if (typeof data === 'number') {
        return _format(lookupMessage(data, message), args);
    }
    return _format(message, args);
}
/**
 * Only used when built: Looks up the message in the global NLS table.
 * This table is being made available as a global through bootstrapping
 * depending on the target context.
 */
function lookupMessage(index, fallback) {
    const message = getNLSMessages()?.[index];
    if (typeof message !== 'string') {
        if (typeof fallback === 'string') {
            return fallback;
        }
        throw new Error(`!!! NLS MISSING: ${index} !!!`);
    }
    return message;
}
/**
 * @skipMangle
 */
export function localize2(data /* | number when built */, originalMessage, ...args) {
    let message;
    if (typeof data === 'number') {
        message = lookupMessage(data, originalMessage);
    }
    else {
        message = originalMessage;
    }
    const value = _format(message, args);
    return {
        value,
        original: originalMessage === message ? value : _format(originalMessage, args),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvbmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLHNEQUFzRDtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2xFLHNEQUFzRDtBQUN0RCxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRWxFLE1BQU0sUUFBUSxHQUNiLGNBQWMsRUFBRSxLQUFLLFFBQVE7SUFDN0IsQ0FBQyxPQUFPLFFBQVEsS0FBSyxXQUFXO1FBQy9CLFFBQVEsQ0FBQyxRQUFRO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUTtRQUMxQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7QUFZckQsU0FBUyxPQUFPLENBQUMsT0FBZSxFQUFFLElBQXNEO0lBQ3ZGLElBQUksTUFBYyxDQUFBO0lBRWxCLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN2QixNQUFNLEdBQUcsT0FBTyxDQUFBO0lBQ2pCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ3RELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkIsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFBO1lBQ2xCLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sR0FBRyxHQUFHLENBQUE7WUFDYixDQUFDO2lCQUFNLElBQ04sT0FBTyxHQUFHLEtBQUssUUFBUTtnQkFDdkIsT0FBTyxHQUFHLEtBQUssU0FBUztnQkFDeEIsR0FBRyxLQUFLLEtBQUssQ0FBQztnQkFDZCxHQUFHLEtBQUssSUFBSSxFQUNYLENBQUM7Z0JBQ0YsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2Qsa0VBQWtFO1FBQ2xFLE1BQU0sR0FBRyxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFBO0lBQ2xFLENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFzQ0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUN2QixJQUE0QixDQUFDLHlCQUF5QixFQUN0RCxPQUFlLENBQUMsdUJBQXVCLEVBQ3ZDLEdBQUcsSUFBc0Q7SUFFekQsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25ELENBQUM7SUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDOUIsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGFBQWEsQ0FBQyxLQUFhLEVBQUUsUUFBdUI7SUFDNUQsTUFBTSxPQUFPLEdBQUcsY0FBYyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ2pDLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDbEMsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssTUFBTSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUNELE9BQU8sT0FBTyxDQUFBO0FBQ2YsQ0FBQztBQXdDRDs7R0FFRztBQUNILE1BQU0sVUFBVSxTQUFTLENBQ3hCLElBQTRCLENBQUMseUJBQXlCLEVBQ3RELGVBQXVCLEVBQ3ZCLEdBQUcsSUFBc0Q7SUFFekQsSUFBSSxPQUFlLENBQUE7SUFDbkIsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM5QixPQUFPLEdBQUcsYUFBYSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQTtJQUMvQyxDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sR0FBRyxlQUFlLENBQUE7SUFDMUIsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFFcEMsT0FBTztRQUNOLEtBQUs7UUFDTCxRQUFRLEVBQUUsZUFBZSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQztLQUM5RSxDQUFBO0FBQ0YsQ0FBQyJ9