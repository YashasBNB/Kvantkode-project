/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// First group matches a double quoted string
// Second group matches a single quoted string
// Third group matches a multi line comment
// Forth group matches a single line comment
// Fifth group matches a trailing comma
const regexp = /("[^"\\]*(?:\\.[^"\\]*)*")|('[^'\\]*(?:\\.[^'\\]*)*')|(\/\*[^\/\*]*(?:(?:\*|\/)[^\/\*]*)*?\*\/)|(\/{2,}.*?(?:(?:\r?\n)|$))|(,\s*[}\]])/g;
/**
 * Strips single and multi line JavaScript comments from JSON
 * content. Ignores characters in strings BUT doesn't support
 * string continuation across multiple lines since it is not
 * supported in JSON.
 *
 * @param content the content to strip comments from
 * @returns the content without comments
 */
export function stripComments(content) {
    return content.replace(regexp, function (match, _m1, _m2, m3, m4, m5) {
        // Only one of m1, m2, m3, m4, m5 matches
        if (m3) {
            // A block comment. Replace with nothing
            return '';
        }
        else if (m4) {
            // Since m4 is a single line comment is is at least of length 2 (e.g. //)
            // If it ends in \r?\n then keep it.
            const length = m4.length;
            if (m4[length - 1] === '\n') {
                return m4[length - 2] === '\r' ? '\r\n' : '\n';
            }
            else {
                return '';
            }
        }
        else if (m5) {
            // Remove the trailing comma
            return match.substring(1);
        }
        else {
            // We match a string
            return match;
        }
    });
}
/**
 * A drop-in replacement for JSON.parse that can parse
 * JSON with comments and trailing commas.
 *
 * @param content the content to strip comments from
 * @returns the parsed content as JSON
 */
export function parse(content) {
    const commentsStripped = stripComments(content);
    try {
        return JSON.parse(commentsStripped);
    }
    catch (error) {
        const trailingCommasStriped = commentsStripped.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(trailingCommasStriped);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoianNvbmMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2pzb25jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLDZDQUE2QztBQUM3Qyw4Q0FBOEM7QUFDOUMsMkNBQTJDO0FBQzNDLDRDQUE0QztBQUM1Qyx1Q0FBdUM7QUFDdkMsTUFBTSxNQUFNLEdBQ1gseUlBQXlJLENBQUE7QUFFMUk7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQWU7SUFDNUMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUNuRSx5Q0FBeUM7UUFDekMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNSLHdDQUF3QztZQUN4QyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7YUFBTSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2YseUVBQXlFO1lBQ3pFLG9DQUFvQztZQUNwQyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFBO1lBQ3hCLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxFQUFFLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7WUFDL0MsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxDQUFBO1lBQ1YsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ2YsNEJBQTRCO1lBQzVCLE9BQU8sS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNQLG9CQUFvQjtZQUNwQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFJLE9BQWU7SUFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFL0MsSUFBSSxDQUFDO1FBQ0osT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzVFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7QUFDRixDQUFDIn0=