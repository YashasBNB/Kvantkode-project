/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Formats a message from the product to be written to the terminal.
 */
export function formatMessageForTerminal(message, options = {}) {
    let result = '';
    if (!options.excludeLeadingNewLine) {
        result += '\r\n';
    }
    result += '\x1b[0m\x1b[7m * ';
    if (options.loudFormatting) {
        result += '\x1b[0;104m';
    }
    else {
        result += '\x1b[0m';
    }
    result += ` ${message} \x1b[0m\n\r`;
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsU3RyaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWNoRzs7R0FFRztBQUNILE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsT0FBZSxFQUNmLFVBQXlDLEVBQUU7SUFFM0MsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sSUFBSSxNQUFNLENBQUE7SUFDakIsQ0FBQztJQUNELE1BQU0sSUFBSSxtQkFBbUIsQ0FBQTtJQUM3QixJQUFJLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUM1QixNQUFNLElBQUksYUFBYSxDQUFBO0lBQ3hCLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxJQUFJLFNBQVMsQ0FBQTtJQUNwQixDQUFDO0lBQ0QsTUFBTSxJQUFJLElBQUksT0FBTyxjQUFjLENBQUE7SUFDbkMsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=