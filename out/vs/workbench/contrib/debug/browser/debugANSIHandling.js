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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdBTlNJSGFuZGxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUNOLHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLDJCQUEyQixFQUMzQiwrQkFBK0IsR0FDL0IsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUU5RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUdyRjs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLElBQVksRUFDWixZQUEyQixFQUMzQixlQUE2QyxFQUM3QyxVQUFvQztJQUVwQyxNQUFNLElBQUksR0FBb0IsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM1RCxNQUFNLFVBQVUsR0FBVyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBRXRDLElBQUksVUFBVSxHQUFhLEVBQUUsQ0FBQTtJQUM3QixJQUFJLGFBQXdDLENBQUE7SUFDNUMsSUFBSSxhQUF3QyxDQUFBO0lBQzVDLElBQUksb0JBQStDLENBQUE7SUFDbkQsSUFBSSxjQUFjLEdBQVksS0FBSyxDQUFBO0lBQ25DLElBQUksVUFBVSxH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