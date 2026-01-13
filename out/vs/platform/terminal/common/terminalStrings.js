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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdHJpbmdzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9jb21tb24vdGVybWluYWxTdHJpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBY2hHOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHdCQUF3QixDQUN2QyxPQUFlLEVBQ2YsVUFBeUMsRUFBRTtJQUUzQyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7SUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7UUFDcEMsTUFBTSxJQUFJLE1BQU0sQ0FBQTtJQUNqQixDQUFDO0lBQ0QsTUFBTSxJQUFJLG1CQUFtQixDQUFBO0lBQzdCLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzVCLE1BQU0sSUFBSSxhQUFhLENBQUE7SUFDeEIsQ0FBQztTQUFNLENBQUM7UUFDUCxNQUFNLElBQUksU0FBUyxDQUFBO0lBQ3BCLENBQUM7SUFDRCxNQUFNLElBQUksSUFBSSxPQUFPLGNBQWMsQ0FBQTtJQUNuQyxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMifQ==