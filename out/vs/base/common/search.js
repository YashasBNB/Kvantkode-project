/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from './strings.js';
export function buildReplaceStringWithCasePreserved(matches, pattern) {
    if (matches && matches[0] !== '') {
        const containsHyphens = validateSpecificSpecialCharacter(matches, pattern, '-');
        const containsUnderscores = validateSpecificSpecialCharacter(matches, pattern, '_');
        if (containsHyphens && !containsUnderscores) {
            return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, '-');
        }
        else if (!containsHyphens && containsUnderscores) {
            return buildReplaceStringForSpecificSpecialCharacter(matches, pattern, '_');
        }
        if (matches[0].toUpperCase() === matches[0]) {
            return pattern.toUpperCase();
        }
        else if (matches[0].toLowerCase() === matches[0]) {
            return pattern.toLowerCase();
        }
        else if (strings.containsUppercaseCharacter(matches[0][0]) && pattern.length > 0) {
            return pattern[0].toUpperCase() + pattern.substr(1);
        }
        else if (matches[0][0].toUpperCase() !== matches[0][0] && pattern.length > 0) {
            return pattern[0].toLowerCase() + pattern.substr(1);
        }
        else {
            // we don't understand its pattern yet.
            return pattern;
        }
    }
    else {
        return pattern;
    }
}
function validateSpecificSpecialCharacter(matches, pattern, specialCharacter) {
    const doesContainSpecialCharacter = matches[0].indexOf(specialCharacter) !== -1 && pattern.indexOf(specialCharacter) !== -1;
    return (doesContainSpecialCharacter &&
        matches[0].split(specialCharacter).length === pattern.split(specialCharacter).length);
}
function buildReplaceStringForSpecificSpecialCharacter(matches, pattern, specialCharacter) {
    const splitPatternAtSpecialCharacter = pattern.split(specialCharacter);
    const splitMatchAtSpecialCharacter = matches[0].split(specialCharacter);
    let replaceString = '';
    splitPatternAtSpecialCharacter.forEach((splitValue, index) => {
        replaceString +=
            buildReplaceStringWithCasePreserved([splitMatchAtSpecialCharacter[index]], splitValue) +
                specialCharacter;
    });
    return replaceString.slice(0, -1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vc2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBRXZDLE1BQU0sVUFBVSxtQ0FBbUMsQ0FDbEQsT0FBd0IsRUFDeEIsT0FBZTtJQUVmLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUNsQyxNQUFNLGVBQWUsR0FBRyxnQ0FBZ0MsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQy9FLE1BQU0sbUJBQW1CLEdBQUcsZ0NBQWdDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNuRixJQUFJLGVBQWUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDN0MsT0FBTyw2Q0FBNkMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLENBQUM7YUFBTSxJQUFJLENBQUMsZUFBZSxJQUFJLG1CQUFtQixFQUFFLENBQUM7WUFDcEQsT0FBTyw2Q0FBNkMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQzVFLENBQUM7UUFDRCxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFPLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUM3QixDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDcEQsT0FBTyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDN0IsQ0FBQzthQUFNLElBQUksT0FBTyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDcEYsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDaEYsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLHVDQUF1QztZQUN2QyxPQUFPLE9BQU8sQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLGdDQUFnQyxDQUN4QyxPQUFpQixFQUNqQixPQUFlLEVBQ2YsZ0JBQXdCO0lBRXhCLE1BQU0sMkJBQTJCLEdBQ2hDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDeEYsT0FBTyxDQUNOLDJCQUEyQjtRQUMzQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLENBQ3BGLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyw2Q0FBNkMsQ0FDckQsT0FBaUIsRUFDakIsT0FBZSxFQUNmLGdCQUF3QjtJQUV4QixNQUFNLDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN0RSxNQUFNLDRCQUE0QixHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUN2RSxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUE7SUFDOUIsOEJBQThCLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQzVELGFBQWE7WUFDWixtQ0FBbUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO2dCQUN0RixnQkFBZ0IsQ0FBQTtJQUNsQixDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNsQyxDQUFDIn0=