/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, HSLA } from '../../../base/common/color.js';
function _parseCaptureGroups(captureGroups) {
    const values = [];
    for (const captureGroup of captureGroups) {
        const parsedNumber = Number(captureGroup);
        if (parsedNumber || (parsedNumber === 0 && captureGroup.replace(/\s/g, '') !== '')) {
            values.push(parsedNumber);
        }
    }
    return values;
}
function _toIColor(r, g, b, a) {
    return {
        red: r / 255,
        blue: b / 255,
        green: g / 255,
        alpha: a,
    };
}
function _findRange(model, match) {
    const index = match.index;
    const length = match[0].length;
    if (index === undefined) {
        return;
    }
    const startPosition = model.positionAt(index);
    const range = {
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: startPosition.lineNumber,
        endColumn: startPosition.column + length,
    };
    return range;
}
function _findHexColorInformation(range, hexValue) {
    if (!range) {
        return;
    }
    const parsedHexColor = Color.Format.CSS.parseHex(hexValue);
    if (!parsedHexColor) {
        return;
    }
    return {
        range: range,
        color: _toIColor(parsedHexColor.rgba.r, parsedHexColor.rgba.g, parsedHexColor.rgba.b, parsedHexColor.rgba.a),
    };
}
function _findRGBColorInformation(range, matches, isAlpha) {
    if (!range || matches.length !== 1) {
        return;
    }
    const match = matches[0];
    const captureGroups = match.values();
    const parsedRegex = _parseCaptureGroups(captureGroups);
    return {
        range: range,
        color: _toIColor(parsedRegex[0], parsedRegex[1], parsedRegex[2], isAlpha ? parsedRegex[3] : 1),
    };
}
function _findHSLColorInformation(range, matches, isAlpha) {
    if (!range || matches.length !== 1) {
        return;
    }
    const match = matches[0];
    const captureGroups = match.values();
    const parsedRegex = _parseCaptureGroups(captureGroups);
    const colorEquivalent = new Color(new HSLA(parsedRegex[0], parsedRegex[1] / 100, parsedRegex[2] / 100, isAlpha ? parsedRegex[3] : 1));
    return {
        range: range,
        color: _toIColor(colorEquivalent.rgba.r, colorEquivalent.rgba.g, colorEquivalent.rgba.b, colorEquivalent.rgba.a),
    };
}
function _findMatches(model, regex) {
    if (typeof model === 'string') {
        return [...model.matchAll(regex)];
    }
    else {
        return model.findMatches(regex);
    }
}
function computeColors(model) {
    const result = [];
    // Early validation for RGB and HSL
    const initialValidationRegex = /\b(rgb|rgba|hsl|hsla)(\([0-9\s,.\%]*\))|\s+(#)([A-Fa-f0-9]{6})\b|\s+(#)([A-Fa-f0-9]{8})\b|^(#)([A-Fa-f0-9]{6})\b|^(#)([A-Fa-f0-9]{8})\b/gm;
    const initialValidationMatches = _findMatches(model, initialValidationRegex);
    // Potential colors have been found, validate the parameters
    if (initialValidationMatches.length > 0) {
        for (const initialMatch of initialValidationMatches) {
            const initialCaptureGroups = initialMatch.filter((captureGroup) => captureGroup !== undefined);
            const colorScheme = initialCaptureGroups[1];
            const colorParameters = initialCaptureGroups[2];
            if (!colorParameters) {
                continue;
            }
            let colorInformation;
            if (colorScheme === 'rgb') {
                const regexParameters = /^\(\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*\)$/gm;
                colorInformation = _findRGBColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), false);
            }
            else if (colorScheme === 'rgba') {
                const regexParameters = /^\(\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\s*,\s*(0[.][0-9]+|[.][0-9]+|[01][.]|[01])\s*\)$/gm;
                colorInformation = _findRGBColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), true);
            }
            else if (colorScheme === 'hsl') {
                const regexParameters = /^\(\s*(36[0]|3[0-5][0-9]|[12][0-9][0-9]|[1-9]?[0-9])\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*\)$/gm;
                colorInformation = _findHSLColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), false);
            }
            else if (colorScheme === 'hsla') {
                const regexParameters = /^\(\s*(36[0]|3[0-5][0-9]|[12][0-9][0-9]|[1-9]?[0-9])\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(100|\d{1,2}[.]\d*|\d{1,2})%\s*,\s*(0[.][0-9]+|[.][0-9]+|[01][.]|[01])\s*\)$/gm;
                colorInformation = _findHSLColorInformation(_findRange(model, initialMatch), _findMatches(colorParameters, regexParameters), true);
            }
            else if (colorScheme === '#') {
                colorInformation = _findHexColorInformation(_findRange(model, initialMatch), colorScheme + colorParameters);
            }
            if (colorInformation) {
                result.push(colorInformation);
            }
        }
    }
    return result;
}
/**
 * Returns an array of all default document colors in the provided document
 */
export function computeDefaultDocumentColors(model) {
    if (!model || typeof model.getValue !== 'function' || typeof model.positionAt !== 'function') {
        // Unknown caller!
        return [];
    }
    return computeColors(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JzQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VzL2RlZmF1bHREb2N1bWVudENvbG9yc0NvbXB1dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFXM0QsU0FBUyxtQkFBbUIsQ0FBQyxhQUF1QztJQUNuRSxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUE7SUFDakIsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUMxQyxNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDekMsSUFBSSxZQUFZLElBQUksQ0FBQyxZQUFZLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDcEYsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLENBQVMsRUFBRSxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVM7SUFDNUQsT0FBTztRQUNOLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRztRQUNaLElBQUksRUFBRSxDQUFDLEdBQUcsR0FBRztRQUNiLEtBQUssRUFBRSxDQUFDLEdBQUcsR0FBRztRQUNkLEtBQUssRUFBRSxDQUFDO0tBQ1IsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FDbEIsS0FBbUMsRUFDbkMsS0FBdUI7SUFFdkIsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFD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