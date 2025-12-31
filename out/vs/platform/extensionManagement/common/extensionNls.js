/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isObject, isString } from '../../../base/common/types.js';
import { localize } from '../../../nls.js';
export function localizeManifest(logger, extensionManifest, translations, fallbackTranslations) {
    try {
        replaceNLStrings(logger, extensionManifest, translations, fallbackTranslations);
    }
    catch (error) {
        logger.error(error?.message ?? error);
        /*Ignore Error*/
    }
    return extensionManifest;
}
/**
 * This routine makes the following assumptions:
 * The root element is an object literal
 */
function replaceNLStrings(logger, extensionManifest, messages, originalMessages) {
    const processEntry = (obj, key, command) => {
        const value = obj[key];
        if (isString(value)) {
            const str = value;
            const length = str.length;
            if (length > 1 && str[0] === '%' && str[length - 1] === '%') {
                const messageKey = str.substr(1, length - 2);
                let translated = messages[messageKey];
                // If the messages come from a language pack they might miss some keys
                // Fill them from the original messages.
                if (translated === undefined && originalMessages) {
                    translated = originalMessages[messageKey];
                }
                const message = typeof translated === 'string' ? translated : translated?.message;
                // This branch returns ILocalizedString's instead of Strings so that the Command Palette can contain both the localized and the original value.
                const original = originalMessages?.[messageKey];
                const originalMessage = typeof original === 'string' ? original : original?.message;
                if (!message) {
                    if (!originalMessage) {
                        logger.warn(`[${extensionManifest.name}]: ${localize('missingNLSKey', "Couldn't find message for key {0}.", messageKey)}`);
                    }
                    return;
                }
                if (
                // if we are translating the title or category of a command
                command &&
                    (key === 'title' || key === 'category') &&
                    // and the original value is not the same as the translated value
                    originalMessage &&
                    originalMessage !== message) {
                    const localizedString = {
                        value: message,
                        original: originalMessage,
                    };
                    obj[key] = localizedString;
                }
                else {
                    obj[key] = message;
                }
            }
        }
        else if (isObject(value)) {
            for (const k in value) {
                if (value.hasOwnProperty(k)) {
                    k === 'commands' ? processEntry(value, k, true) : processEntry(value, k, command);
                }
            }
        }
        else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                processEntry(value, i, command);
            }
        }
    };
    for (const key in extensionManifest) {
        if (extensionManifest.hasOwnProperty(key)) {
            processEntry(extensionManifest, key);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTmxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vZXh0ZW5zaW9uTmxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBTzFDLE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsTUFBZSxFQUNmLGlCQUFxQyxFQUNyQyxZQUEyQixFQUMzQixvQkFBb0M7SUFFcEMsSUFBSSxDQUFDO1FBQ0osZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ2hGLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2hCLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQTtRQUNyQyxnQkFBZ0I7SUFDakIsQ0FBQztJQUNELE9BQU8saUJBQWlCLENBQUE7QUFDekIsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQVMsZ0JBQWdCLENBQ3hCLE1BQWUsRUFDZixpQkFBcUMsRUFDckMsUUFBdUIsRUFDdkIsZ0JBQWdDO0lBRWhDLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBUSxFQUFFLEdBQW9CLEVBQUUsT0FBaUIsRUFBRSxFQUFFO1FBQzFFLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QixJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sR0FBRyxHQUFXLEtBQUssQ0FBQTtZQUN6QixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFB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