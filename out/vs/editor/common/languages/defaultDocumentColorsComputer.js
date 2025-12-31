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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdERvY3VtZW50Q29sb3JzQ29tcHV0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2xhbmd1YWdlcy9kZWZhdWx0RG9jdW1lbnRDb2xvcnNDb21wdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBVzNELFNBQVMsbUJBQW1CLENBQUMsYUFBdUM7SUFDbkUsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2pCLEtBQUssTUFBTSxZQUFZLElBQUksYUFBYSxFQUFFLENBQUM7UUFDMUMsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQ3pDLElBQUksWUFBWSxJQUFJLENBQUMsWUFBWSxLQUFLLENBQUMsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3BGLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxDQUFTLEVBQUUsQ0FBUyxFQUFFLENBQVMsRUFBRSxDQUFTO0lBQzVELE9BQU87UUFDTixHQUFHLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDWixJQUFJLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDYixLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUc7UUFDZCxLQUFLLEVBQUUsQ0FBQztLQUNSLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQ2xCLEtBQW1DLEVBQ25DLEtBQXVCO0lBRXZCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFL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