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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9udHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9mb250cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBRXhDLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRTFFOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTO0lBQzNDLENBQUMsQ0FBQyxxQ0FBcUM7SUFDdkMsQ0FBQyxDQUFDLFdBQVc7UUFDWixDQUFDLENBQUMsK0NBQStDO1FBQ2pELENBQUMsQ0FBQywrQ0FBK0MsQ0FBQTtBQU1uRCxNQUFNLENBQUMsTUFBTSxRQUFRLEdBQUcsS0FBSyxJQUF1QixFQUFFO0lBQ3JELElBQUksQ0FBQztRQUNKLGFBQWE7UUFDYixNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU0sVUFBVSxDQUFDLGVBQWUsRUFBRSxDQUFlLENBQUE7UUFDaEUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFBO1FBQzdCLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUN0RCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ2hELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztBQUNGLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxLQUFLLElBQW1DLEVBQUU7SUFDeEUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sUUFBUSxFQUFFLENBQUE7SUFDOUIsTUFBTSxRQUFRLEdBQXlCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUN6RCxPQUFPO1lBQ04sSUFBSSxFQUFFLEdBQUcsSUFBSSxFQUFFO1NBQ2YsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsT0FBTyxRQUFRLENBQUE7QUFDaEIsQ0FBQyxDQUFBIn0=