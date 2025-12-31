/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hash } from '../../../../base/common/hash.js';
import { URI } from '../../../../base/common/uri.js';
import { getIconRegistry } from '../../../../platform/theme/common/iconRegistry.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { ansiColorMap } from '../common/terminalColorRegistry.js';
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export function getColorClass(terminalOrColorKey) {
    let color = undefined;
    if (typeof terminalOrColorKey === 'string') {
        color = terminalOrColorKey;
    }
    else if (terminalOrColorKey.color) {
        color = terminalOrColorKey.color.replace(/\./g, '_');
    }
    else if (ThemeIcon.isThemeIcon(terminalOrColorKey.icon) && terminalOrColorKey.icon.color) {
        color = terminalOrColorKey.icon.color.id.replace(/\./g, '_');
    }
    if (color) {
        return `terminal-icon-${color.replace(/\./g, '_')}`;
    }
    return undefined;
}
export function getStandardColors(colorTheme) {
    const standardColors = [];
    for (const colorKey in ansiColorMap) {
        const color = colorTheme.getColor(colorKey);
        if (color && !colorKey.toLowerCase().includes('bright')) {
            standardColors.push(colorKey);
        }
    }
    return standardColors;
}
export function createColorStyleElement(colorTheme) {
    const disposable = new DisposableStore();
    const standardColors = getStandardColors(colorTheme);
    const styleElement = createStyleSheet(undefined, undefined, disposable);
    let css = '';
    for (const colorKey of standardColors) {
        const colorClass = getColorClass(colorKey);
        const color = colorTheme.getColor(colorKey);
        if (color) {
            css +=
                `.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon)` +
                    `{ color: ${color} !important; }`;
        }
    }
    styleElement.textContent = css;
    return disposable;
}
export function getColorStyleContent(colorTheme, editor) {
    const standardColors = getStandardColors(colorTheme);
    let css = '';
    for (const colorKey of standardColors) {
        const colorClass = getColorClass(colorKey);
        const color = colorTheme.getColor(colorKey);
        if (color) {
            if (editor) {
                css +=
                    `.monaco-workbench .show-file-icons .predefined-file-icon.terminal-tab.${colorClass}::before,` +
                        `.monaco-workbench .show-file-icons .file-icon.terminal-tab.${colorClass}::before` +
                        `{ color: ${color} !important; }`;
            }
            else {
                css +=
                    `.monaco-workbench .${colorClass} .codicon:first-child:not(.codicon-split-horizontal):not(.codicon-trashcan):not(.file-icon)` +
                        `{ color: ${color} !important; }`;
            }
        }
    }
    return css;
}
export function getUriClasses(terminal, colorScheme, extensionContributed) {
    const icon = terminal.icon;
    if (!icon) {
        return undefined;
    }
    const iconClasses = [];
    let uri = undefined;
    if (extensionContributed) {
        if (typeof icon === 'string' && (icon.startsWith('$(') || getIconRegistry().getIcon(icon))) {
            return iconClasses;
        }
        else if (typeof icon === 'string') {
            uri = URI.parse(icon);
        }
    }
    if (icon instanceof URI) {
        uri = icon;
    }
    else if (icon instanceof Object && 'light' in icon && 'dark' in icon) {
        uri = colorScheme === ColorScheme.LIGHT ? icon.light : icon.dark;
    }
    if (uri instanceof URI) {
        const uriIconKey = hash(uri.path).toString(36);
        const className = `terminal-uri-icon-${uriIconKey}`;
        iconClasses.push(className);
        iconClasses.push(`terminal-uri-icon`);
    }
    return iconClasses;
}
export function getIconId(accessor, terminal) {
    if (!terminal.icon || (terminal.icon instanceof Object && !('id' in terminal.icon))) {
        return accessor.get(ITerminalProfileResolverService).getDefaultIcon().id;
    }
    return typeof terminal.icon === 'string' ? terminal.icon : terminal.icon.id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEljb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU1wRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXhFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBUW5GLE1BQU0sVUFBVSxhQUFhLENBQzVCLGtCQUE2RjtJQUU3RixJQUFJLEtBQUssR0FBRyxTQUFTLENBQUE7SUFDckIsSUFBSSxPQUFPLGtCQUFrQixLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQTtJQUMzQixDQUFDO1NBQU0sSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQyxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDckQsQ0FBQztTQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0Is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