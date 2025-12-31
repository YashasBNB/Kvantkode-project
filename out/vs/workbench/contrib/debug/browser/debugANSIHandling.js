/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color, RGBA } from '../../../../base/common/color.js';
import { isDefined } from '../../../../base/common/types.js';
import { editorHoverBackground, listActiveSelectionBackground, listFocusBackground, listInactiveFocusBackground, listInactiveSelectionBackground, } from '../../../../platform/theme/common/colorRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../common/theme.js';
import { ansiColorIdentifiers } from '../../terminal/common/terminalColorRegistry.js';
/**
 * @param text The content to stylize.
 * @returns An {@link HTMLSpanElement} that contains the potentially stylized text.
 */
export function handleANSIOutput(text, linkDetector, workspaceFolder, highlights) {
    const root = document.createElement('span');
    const textLength = text.length;
    let styleNames = [];
    let customFgColor;
    let customBgColor;
    let customUnderlineColor;
    let colorsInverted = false;
    let currentPos = 0;
    let unprintedChars = 0;
    let buffer = '';
    while (currentPos < textLength) {
        let sequenceFound = false;
        // Potentially an ANSI escape sequence.
        // See http://ascii-table.com/ansi-escape-sequences.php & https://en.wikipedia.org/wiki/ANSI_escape_code
        if (text.charCodeAt(currentPos) === 27 && text.charAt(currentPos + 1) === '[') {
            const startPos = currentPos;
            currentPos += 2; // Ignore 'Esc[' as it's in every sequence.
            let ansiSequence = '';
            while (currentPos < textLength) {
                const char = text.charAt(currentPos);
                ansiSequence += char;
                currentPos++;
                // Look for a known sequence terminating character.
                if (char.match(/^[ABCDHIJKfhmpsu]$/)) {
                    sequenceFound = true;
                    break;
                }
            }
            if (sequenceFound) {
                unprintedChars += 2 + ansiSequence.length;
                // Flush buffer with previous styles.
                appendStylizedStringToContainer(root, buffer, styleNames, linkDetector, workspaceFolder, customFgColor, customBgColor, customUnderlineColor, highlights, currentPos - buffer.length - unprintedChars);
                buffer = '';
                /*
                 * Certain ranges that are matched here do not contain real graphics rendition sequences. For
                 * the sake of having a simpler expression, they have been included anyway.
                 */
                if (ansiSequence.match(/^(?:[34][0-8]|9[0-7]|10[0-7]|[0-9]|2[1-5,7-9]|[34]9|5[8,9]|1[0-9])(?:;[349][0-7]|10[0-7]|[013]|[245]|[34]9)?(?:;[012]?[0-9]?[0-9])*;?m$/)) {
                    const styleCodes = ansiSequence
                        .slice(0, -1) // Remove final 'm' character.
                        .split(';') // Separate style codes.
                        .filter((elem) => elem !== '') // Filter empty elems as '34;m' -> ['34', ''].
                        .map((elem) => parseInt(elem, 10)); // Convert to numbers.
                    if (styleCodes[0] === 38 || styleCodes[0] === 48 || styleCodes[0] === 58) {
                        // Advanced color code - can't be combined with formatting codes like simple colors can
                        // Ignores invalid colors and additional info beyond what is necessary
                        const colorType = styleCodes[0] === 38
                            ? 'foreground'
                            : styleCodes[0] === 48
                                ? 'background'
                                : 'underline';
                        if (styleCodes[1] === 5) {
                            set8BitColor(styleCodes, colorType);
                        }
                        else if (styleCodes[1] === 2) {
                            set24BitColor(styleCodes, colorType);
                        }
                    }
                    else {
                        setBasicFormatters(styleCodes);
                    }
                }
                else {
                    // Unsupported sequence so simply hide it.
                }
            }
            else {
                currentPos = startPos;
            }
        }
        if (sequenceFound === false) {
            buffer += text.charAt(currentPos);
            currentPos++;
        }
    }
    // Flush remaining text buffer if not empty.
    if (buffer) {
        appendStylizedStringToContainer(root, buffer, styleNames, linkDetector, workspaceFolder, customFgColor, customBgColor, customUnderlineColor, highlights, currentPos - buffer.length);
    }
    return root;
    /**
     * Change the foreground or background color by clearing the current color
     * and adding the new one.
     * @param colorType If `'foreground'`, will change the foreground color, if
     * 	`'background'`, will change the background color, and if `'underline'`
     * will set the underline color.
     * @param color Color to change to. If `undefined` or not provided,
     * will clear current color without adding a new one.
     */
    function changeColor(colorType, color) {
        if (colorType === 'foreground') {
            customFgColor = color;
        }
        else if (colorType === 'background') {
            customBgColor = color;
        }
        else if (colorType === 'underline') {
            customUnderlineColor = color;
        }
        styleNames = styleNames.filter((style) => style !== `code-${colorType}-colored`);
        if (color !== undefined) {
            styleNames.push(`code-${colorType}-colored`);
        }
    }
    /**
     * Swap foreground and background colors.  Used for color inversion.  Caller should check
     * [] flag to make sure it is appropriate to turn ON or OFF (if it is already inverted don't call
     */
    function reverseForegroundAndBackgroundColors() {
        const oldFgColor = customFgColor;
        changeColor('foreground', customBgColor);
        changeColor('background', oldFgColor);
    }
    /**
     * Calculate and set basic ANSI formatting. Supports ON/OFF of bold, italic, underline,
     * double underline,  crossed-out/strikethrough, overline, dim, blink, rapid blink,
     * reverse/invert video, hidden, superscript, subscript and alternate font codes,
     * clearing/resetting of foreground, background and underline colors,
     * setting normal foreground and background colors, and bright foreground and
     * background colors. Not to be used for codes containing advanced colors.
     * Will ignore invalid codes.
     * @param styleCodes Array of ANSI basic styling numbers, which will be
     * applied in order. New colors and backgrounds clear old ones; new formatting
     * does not.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#SGR }
     */
    function setBasicFormatters(styleCodes) {
        for (const code of styleCodes) {
            switch (code) {
                case 0: {
                    // reset (everything)
                    styleNames = [];
                    customFgColor = undefined;
                    customBgColor = undefined;
                    break;
                }
                case 1: {
                    // bold
                    styleNames = styleNames.filter((style) => style !== `code-bold`);
                    styleNames.push('code-bold');
                    break;
                }
                case 2: {
                    // dim
                    styleNames = styleNames.filter((style) => style !== `code-dim`);
                    styleNames.push('code-dim');
                    break;
                }
                case 3: {
                    // italic
                    styleNames = styleNames.filter((style) => style !== `code-italic`);
                    styleNames.push('code-italic');
                    break;
                }
                case 4: {
                    // underline
                    styleNames = styleNames.filter((style) => style !== `code-underline` && style !== `code-double-underline`);
                    styleNames.push('code-underline');
                    break;
                }
                case 5: {
                    // blink
                    styleNames = styleNames.filter((style) => style !== `code-blink`);
                    styleNames.push('code-blink');
                    break;
                }
                case 6: {
                    // rapid blink
                    styleNames = styleNames.filter((style) => style !== `code-rapid-blink`);
                    styleNames.push('code-rapid-blink');
                    break;
                }
                case 7: {
                    // invert foreground and background
                    if (!colorsInverted) {
                        colorsInverted = true;
                        reverseForegroundAndBackgroundColors();
                    }
                    break;
                }
                case 8: {
                    // hidden
                    styleNames = styleNames.filter((style) => style !== `code-hidden`);
                    styleNames.push('code-hidden');
                    break;
                }
                case 9: {
                    // strike-through/crossed-out
                    styleNames = styleNames.filter((style) => style !== `code-strike-through`);
                    styleNames.push('code-strike-through');
                    break;
                }
                case 10: {
                    // normal default font
                    styleNames = styleNames.filter((style) => !style.startsWith('code-font'));
                    break;
                }
                case 11:
                case 12:
                case 13:
                case 14:
                case 15:
                case 16:
                case 17:
                case 18:
                case 19:
                case 20: {
                    // font codes (and 20 is 'blackletter' font code)
                    styleNames = styleNames.filter((style) => !style.startsWith('code-font'));
                    styleNames.push(`code-font-${code - 10}`);
                    break;
                }
                case 21: {
                    // double underline
                    styleNames = styleNames.filter((style) => style !== `code-underline` && style !== `code-double-underline`);
                    styleNames.push('code-double-underline');
                    break;
                }
                case 22: {
                    // normal intensity (bold off and dim off)
                    styleNames = styleNames.filter((style) => style !== `code-bold` && style !== `code-dim`);
                    break;
                }
                case 23: {
                    // Neither italic or blackletter (font 10)
                    styleNames = styleNames.filter((style) => style !== `code-italic` && style !== `code-font-10`);
                    break;
                }
                case 24: {
                    // not underlined (Neither singly nor doubly underlined)
                    styleNames = styleNames.filter((style) => style !== `code-underline` && style !== `code-double-underline`);
                    break;
                }
                case 25: {
                    // not blinking
                    styleNames = styleNames.filter((style) => style !== `code-blink` && style !== `code-rapid-blink`);
                    break;
                }
                case 27: {
                    // not reversed/inverted
                    if (colorsInverted) {
                        colorsInverted = false;
                        reverseForegroundAndBackgroundColors();
                    }
                    break;
                }
                case 28: {
                    // not hidden (reveal)
                    styleNames = styleNames.filter((style) => style !== `code-hidden`);
                    break;
                }
                case 29: {
                    // not crossed-out
                    styleNames = styleNames.filter((style) => style !== `code-strike-through`);
                    break;
                }
                case 53: {
                    // overlined
                    styleNames = styleNames.filter((style) => style !== `code-overline`);
                    styleNames.push('code-overline');
                    break;
                }
                case 55: {
                    // not overlined
                    styleNames = styleNames.filter((style) => style !== `code-overline`);
                    break;
                }
                case 39: {
                    // default foreground color
                    changeColor('foreground', undefined);
                    break;
                }
                case 49: {
                    // default background color
                    changeColor('background', undefined);
                    break;
                }
                case 59: {
                    // default underline color
                    changeColor('underline', undefined);
                    break;
                }
                case 73: {
                    // superscript
                    styleNames = styleNames.filter((style) => style !== `code-superscript` && style !== `code-subscript`);
                    styleNames.push('code-superscript');
                    break;
                }
                case 74: {
                    // subscript
                    styleNames = styleNames.filter((style) => style !== `code-superscript` && style !== `code-subscript`);
                    styleNames.push('code-subscript');
                    break;
                }
                case 75: {
                    // neither superscript or subscript
                    styleNames = styleNames.filter((style) => style !== `code-superscript` && style !== `code-subscript`);
                    break;
                }
                default: {
                    setBasicColor(code);
                    break;
                }
            }
        }
    }
    /**
     * Calculate and set styling for complicated 24-bit ANSI color codes.
     * @param styleCodes Full list of integer codes that make up the full ANSI
     * sequence, including the two defining codes and the three RGB codes.
     * @param colorType If `'foreground'`, will set foreground color, if
     * `'background'`, will set background color, and if it is `'underline'`
     * will set the underline color.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#24-bit }
     */
    function set24BitColor(styleCodes, colorType) {
        if (styleCodes.length >= 5 &&
            styleCodes[2] >= 0 &&
            styleCodes[2] <= 255 &&
            styleCodes[3] >= 0 &&
            styleCodes[3] <= 255 &&
            styleCodes[4] >= 0 &&
            styleCodes[4] <= 255) {
            const customColor = new RGBA(styleCodes[2], styleCodes[3], styleCodes[4]);
            changeColor(colorType, customColor);
        }
    }
    /**
     * Calculate and set styling for advanced 8-bit ANSI color codes.
     * @param styleCodes Full list of integer codes that make up the ANSI
     * sequence, including the two defining codes and the one color code.
     * @param colorType If `'foreground'`, will set foreground color, if
     * `'background'`, will set background color and if it is `'underline'`
     * will set the underline color.
     * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit }
     */
    function set8BitColor(styleCodes, colorType) {
        let colorNumber = styleCodes[2];
        const color = calcANSI8bitColor(colorNumber);
        if (color) {
            changeColor(colorType, color);
        }
        else if (colorNumber >= 0 && colorNumber <= 15) {
            if (colorType === 'underline') {
                // for underline colors we just decode the 0-15 color number to theme color, set and return
                const colorName = ansiColorIdentifiers[colorNumber];
                changeColor(colorType, `--vscode-debug-ansi-${colorName}`);
                return;
            }
            // Need to map to one of the four basic color ranges (30-37, 90-97, 40-47, 100-107)
            colorNumber += 30;
            if (colorNumber >= 38) {
                // Bright colors
                colorNumber += 52;
            }
            if (colorType === 'background') {
                colorNumber += 10;
            }
            setBasicColor(colorNumber);
        }
    }
    /**
     * Calculate and set styling for basic bright and dark ANSI color codes. Uses
     * theme colors if available. Automatically distinguishes between foreground
     * and background colors; does not support color-clearing codes 39 and 49.
     * @param styleCode Integer color code on one of the following ranges:
     * [30-37, 90-97, 40-47, 100-107]. If not on one of these ranges, will do
     * nothing.
     */
    function setBasicColor(styleCode) {
        let colorType;
        let colorIndex;
        if (styleCode >= 30 && styleCode <= 37) {
            colorIndex = styleCode - 30;
            colorType = 'foreground';
        }
        else if (styleCode >= 90 && styleCode <= 97) {
            colorIndex = styleCode - 90 + 8; // High-intensity (bright)
            colorType = 'foreground';
        }
        else if (styleCode >= 40 && styleCode <= 47) {
            colorIndex = styleCode - 40;
            colorType = 'background';
        }
        else if (styleCode >= 100 && styleCode <= 107) {
            colorIndex = styleCode - 100 + 8; // High-intensity (bright)
            colorType = 'background';
        }
        if (colorIndex !== undefined && colorType) {
            const colorName = ansiColorIdentifiers[colorIndex];
            changeColor(colorType, `--vscode-debug-ansi-${colorName.replaceAll('.', '-')}`);
        }
    }
}
/**
 * @param root The {@link HTMLElement} to append the content to.
 * @param stringContent The text content to be appended.
 * @param cssClasses The list of CSS styles to apply to the text content.
 * @param linkDetector The {@link ILinkDetector} responsible for generating links from {@param stringContent}.
 * @param customTextColor If provided, will apply custom color with inline style.
 * @param customBackgroundColor If provided, will apply custom backgroundColor with inline style.
 * @param customUnderlineColor If provided, will apply custom textDecorationColor with inline style.
 * @param highlights The ranges to highlight.
 * @param offset The starting index of the stringContent in the original text.
 */
export function appendStylizedStringToContainer(root, stringContent, cssClasses, linkDetector, workspaceFolder, customTextColor, customBackgroundColor, customUnderlineColor, highlights, offset) {
    if (!root || !stringContent) {
        return;
    }
    const container = linkDetector.linkify(stringContent, true, workspaceFolder, undefined, undefined, highlights?.map((h) => ({
        start: h.start - offset,
        end: h.end - offset,
        extraClasses: h.extraClasses,
    })));
    container.className = cssClasses.join(' ');
    if (customTextColor) {
        container.style.color =
            typeof customTextColor === 'string'
                ? `var(${customTextColor})`
                : Color.Format.CSS.formatRGB(new Color(customTextColor));
    }
    if (customBackgroundColor) {
        container.style.backgroundColor =
            typeof customBackgroundColor === 'string'
                ? `var(${customBackgroundColor})`
                : Color.Format.CSS.formatRGB(new Color(customBackgroundColor));
    }
    if (customUnderlineColor) {
        container.style.textDecorationColor =
            typeof customUnderlineColor === 'string'
                ? `var(${customUnderlineColor})`
                : Color.Format.CSS.formatRGB(new Color(customUnderlineColor));
    }
    root.appendChild(container);
}
/**
 * Calculate the color from the color set defined in the ANSI 8-bit standard.
 * Standard and high intensity colors are not defined in the standard as specific
 * colors, so these and invalid colors return `undefined`.
 * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code#8-bit } for info.
 * @param colorNumber The number (ranging from 16 to 255) referring to the color
 * desired.
 */
export function calcANSI8bitColor(colorNumber) {
    if (colorNumber % 1 !== 0) {
        // Should be integer
        return;
    }
    if (colorNumber >= 16 && colorNumber <= 231) {
        // Converts to one of 216 RGB colors
        colorNumber -= 16;
        let blue = colorNumber % 6;
        colorNumber = (colorNumber - blue) / 6;
        let green = colorNumber % 6;
        colorNumber = (colorNumber - green) / 6;
        let red = colorNumber;
        // red, green, blue now range on [0, 5], need to map to [0,255]
        const convFactor = 255 / 5;
        blue = Math.round(blue * convFactor);
        green = Math.round(green * convFactor);
        red = Math.round(red * convFactor);
        return new RGBA(red, green, blue);
    }
    else if (colorNumber >= 232 && colorNumber <= 255) {
        // Converts to a grayscale value
        colorNumber -= 232;
        const colorLevel = Math.round((colorNumber / 23) * 255);
        return new RGBA(colorLevel, colorLevel, colorLevel);
    }
    else {
        return;
    }
}
registerThemingParticipant((theme, collector) => {
    const areas = [
        {
            selector: '.monaco-workbench .sidebar, .monaco-workbench .auxiliarybar',
            bg: theme.getColor(SIDE_BAR_BACKGROUND),
        },
        { selector: '.monaco-workbench .panel', bg: theme.getColor(PANEL_BACKGROUND) },
        {
            selector: '.monaco-workbench .monaco-list-row.selected',
            bg: theme.getColor(listInactiveSelectionBackground),
        },
        {
            selector: '.monaco-workbench .monaco-list-row.focused',
            bg: theme.getColor(listInactiveFocusBackground),
        },
        {
            selector: '.monaco-workbench .monaco-list:focus .monaco-list-row.focused',
            bg: theme.getColor(listFocusBackground),
        },
        {
            selector: '.monaco-workbench .monaco-list:focus .monaco-list-row.selected',
            bg: theme.getColor(listActiveSelectionBackground),
        },
        { selector: '.debug-hover-widget', bg: theme.getColor(editorHoverBackground) },
    ];
    for (const { selector, bg } of areas) {
        const content = ansiColorIdentifiers
            .map((color) => {
            const actual = theme.getColor(color);
            if (!actual) {
                return undefined;
            }
            // this uses the default contrast ratio of 4 (from the terminal),
            // we may want to make this configurable in the future, but this is
            // good to keep things sane to start with.
            return `--vscode-debug-ansi-${color.replaceAll('.', '-')}:${bg ? bg.ensureConstrast(actual, 4) : actual}`;
        })
            .filter(isDefined);
        collector.addRule(`${selector} { ${content.join(';')} }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQU5TSUhhbmRsaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFDTixxQkFBcUIsRUFDckIsNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQiwyQkFBMkIsRUFDM0IsK0JBQStCLEdBQy9CLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHckY7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixJQUFZLEVBQ1osWUFBMkIsRUFDM0IsZUFBNkMsRUFDN0MsVUFBb0M7SUFFcEMsTUFBTSxJQUFJLEdBQW9CLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDNUQsTUFBTSxVQUFVLEdBQVcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUV0QyxJQUFJLFVBQVUsR0FBYSxFQUFFLENBQUE7SUFDN0IsSUFBSSxhQUF3QyxDQUFBO0lBQzVDLElBQUksYUFBd0MsQ0FBQTtJQUM1QyxJQUFJLG9CQUErQyxDQUFBO0lBQ25ELElBQUksY0FBYyxHQUFZLEtBQUssQ0FBQTtJQUNuQyxJQUFJLFVBQVUsR0FBVyxDQUFDLENBQUE7SUFDMUIsSUFB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