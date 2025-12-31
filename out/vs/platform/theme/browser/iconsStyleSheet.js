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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbnNTdHlsZVNoZWV0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvYnJvd3Nlci9pY29uc1N0eWxlU2hlZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUF3QyxNQUFNLDJCQUEyQixDQUFBO0FBUWpHLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxZQUF1QztJQUN6RSxNQUFNLFVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXhDLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7SUFDOUQsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7SUFDdEMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUN6RSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2xCLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLDJCQUEyQixDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBRUQsT0FBTztRQUNOLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO1FBQ25DLFdBQVcsRUFBRSxr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