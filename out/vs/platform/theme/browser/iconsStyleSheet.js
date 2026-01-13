/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as css from '../../../base/browser/cssValue.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { getIconRegistry } from '../common/iconRegistry.js';
export function getIconsStyleSheet(themeService) {
    const disposable = new DisposableStore();
    const onDidChangeEmmiter = disposable.add(new Emitter());
    const iconRegistry = getIconRegistry();
    disposable.add(iconRegistry.onDidChange(() => onDidChangeEmmiter.fire()));
    if (themeService) {
        disposable.add(themeService.onDidProductIconThemeChange(() => onDidChangeEmmiter.fire()));
    }
    return {
        dispose: () => disposable.dispose(),
        onDidChange: onDidChangeEmmiter.event,
        getCSS() {
            const productIconTheme = themeService
                ? themeService.getProductIconTheme()
                : new UnthemedProductIconTheme();
            const usedFontIds = {};
            const rules = new css.Builder();
            const rootAttribs = new css.Builder();
            for (const contribution of iconRegistry.getIcons()) {
                const definition = productIconTheme.getIcon(contribution);
                if (!definition) {
                    continue;
                }
                const fontContribution = definition.font;
                const fontFamilyVar = css.inline `--vscode-icon-${css.className(contribution.id)}-font-family`;
                const contentVar = css.inline `--vscode-icon-${css.className(contribution.id)}-content`;
                if (fontContribution) {
                    usedFontIds[fontContribution.id] = fontContribution.definition;
                    rootAttribs.push(css.inline `${fontFamilyVar}: ${css.stringValue(fontContribution.id)};`, css.inline `${contentVar}: ${css.stringValue(definition.fontCharacter)};`);
                    rules.push(css.inline `.codicon-${css.className(contribution.id)}:before { content: ${css.stringValue(definition.fontCharacter)}; font-family: ${css.stringValue(fontContribution.id)}; }`);
                }
                else {
                    rootAttribs.push(css.inline `${contentVar}: ${css.stringValue(definition.fontCharacter)}; ${fontFamilyVar}: 'codicon';`);
                    rules.push(css.inline `.codicon-${css.className(contribution.id)}:before { content: ${css.stringValue(definition.fontCharacter)}; }`);
                }
            }
            for (const id in usedFontIds) {
                const definition = usedFontIds[id];
                const fontWeight = definition.weight
                    ? css.inline `font-weight: ${css.identValue(definition.weight)};`
                    : css.inline ``;
                const fontStyle = definition.style
                    ? css.inline `font-style: ${css.identValue(definition.style)};`
                    : css.inline ``;
                const src = new css.Builder();
                for (const l of definition.src) {
                    src.push(css.inline `${css.asCSSUrl(l.location)} format(${css.stringValue(l.format)})`);
                }
                rules.push(css.inline `@font-face { src: ${src.join(', ')}; font-family: ${css.stringValue(id)};${fontWeight}${fontStyle} font-display: block; }`);
            }
            rules.push(css.inline `:root { ${rootAttribs.join(' ')} }`);
            return rules.join('\n');
        },
    };
}
export class UnthemedProductIconTheme {
    getIcon(contribution) {
        const iconRegistry = getIconRegistry();
        let definition = contribution.defaults;
        while (ThemeIcon.isThemeIcon(definition)) {
            const c = iconRegistry.getIcon(definition.id);
            if (!c) {
                return undefined;
            }
            definition = c.defaults;
        }
        return definition;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnNTdHlsZVNoZWV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9icm93c2VyL2ljb25zU3R5bGVTaGVldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG1DQUFtQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQXdDLE1BQU0sMkJBQTJCLENBQUE7QUFRakcsTUFBTSxVQUFVLGtCQUFrQixDQUFDLFlBQXVDO0lBQ3pFLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFeEMsTUFBTSxrQkFBa0IsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtJQUM5RCxNQUFNLFlBQVksR0FBRyxlQUFlLEVBQUUsQ0FBQTtJQUN0QyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3pFLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsMkJBQTJCLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFGLENBQUM7SUFFRCxPQUFPO1FBQ04sT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFP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