/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from './window.js';
import { isElectron, isMacintosh, isWindows } from '../common/platform.js';
/**
 * The best font-family to be used in CSS based on the platform:
 * - Windows: Segoe preferred, fallback to sans-serif
 * - macOS: standard system font, fallback to sans-serif
 * - Linux: standard system font preferred, fallback to Ubuntu fonts
 *
 * Note: this currently does not adjust for different locales.
 */
export const DEFAULT_FONT_FAMILY = isWindows
    ? '"Segoe WPC", "Segoe UI", sans-serif'
    : isMacintosh
        ? '-apple-system, BlinkMacSystemFont, sans-serif'
        : 'system-ui, "Ubuntu", "Droid Sans", sans-serif';
export const getFonts = async () => {
    try {
        // @ts-ignore
        const fonts = (await mainWindow.queryLocalFonts());
        const fontsArray = [...fonts];
        const families = fontsArray.map((font) => font.family);
        return families;
    }
    catch (error) {
        console.error(`Failed to query fonts: ${error}`);
        return [];
    }
};
export const getFontSnippets = async () => {
    if (!isElectron) {
        return [];
    }
    const fonts = await getFonts();
    const snippets = fonts.map((font) => {
        return {
            body: `${font}`,
        };
    });
    return snippets;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZm9udHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUxRTs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsU0FBUztJQUMzQyxDQUFDLENBQUMscUNBQXFDO0lBQ3ZDLENBQUMsQ0FBQyxXQUFXO1FBQ1osQ0FBQyxDQUFDLCtDQUErQztRQUNqRCxDQUFDLENBQUMsK0NBQStDLENBQUE7QUFNbkQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEtBQUssSUFBdUIsRUFBRTtJQUNyRCxJQUFJLENBQUM7UUFDSixhQUFhO1FBQ2IsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxlQUFlLEVBQUUsQ0FBZSxDQUFBO1FBQ2hFLE1BQU0sVUFBVSxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUM3QixNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEQsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUNoRCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7QUFDRixDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsS0FBSyxJQUFtQyxFQUFFO0lBQ3hFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLFFBQVEsRUFBRSxDQUFBO0lBQzlCLE1BQU0sUUFBUSxHQUF5QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDekQsT0FBTztZQUNOLElBQUksRUFBRSxHQUFHLElBQUksRUFBRTtTQUNmLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sUUFBUSxDQUFBO0FBQ2hCLENBQUMsQ0FBQSJ9