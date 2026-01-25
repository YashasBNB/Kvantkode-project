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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJY29uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsSWNvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBTXBELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFeEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFRbkYsTUFBTSxVQUFVLGFBQWEsQ0FDNUIsa0JBQTZGO0lBRTdGLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQTtJQUNyQixJQUFJLE9BQU8sa0JBQWtCLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDNUMsS0FBSyxHQUFHLGtCQUFrQixDQUFBO0lBQzNCLENBQUM7U0FBTSxJQUFJLGtCQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JDLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNyRCxDQUFDO1NBQU0sSUFBSSxTQUFTLENBQUMsV0FBVyxDQUFDLGtC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