/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from './codicons.js';
export var ThemeColor;
(function (ThemeColor) {
    function isThemeColor(obj) {
        return obj && typeof obj === 'object' && typeof obj.id === 'string';
    }
    ThemeColor.isThemeColor = isThemeColor;
})(ThemeColor || (ThemeColor = {}));
export function themeColorFromId(id) {
    return { id };
}
export var ThemeIcon;
(function (ThemeIcon) {
    ThemeIcon.iconNameSegment = '[A-Za-z0-9]+';
    ThemeIcon.iconNameExpression = '[A-Za-z0-9-]+';
    ThemeIcon.iconModifierExpression = '~[A-Za-z]+';
    ThemeIcon.iconNameCharacter = '[A-Za-z0-9~-]';
    const ThemeIconIdRegex = new RegExp(`^(${ThemeIcon.iconNameExpression})(${ThemeIcon.iconModifierExpression})?$`);
    function asClassNameArray(icon) {
        const match = ThemeIconIdRegex.exec(icon.id);
        if (!match) {
            return asClassNameArray(Codicon.error);
        }
        const [, id, modifier] = match;
        const classNames = ['codicon', 'codicon-' + id];
        if (modifier) {
            classNames.push('codicon-modifier-' + modifier.substring(1));
        }
        return classNames;
    }
    ThemeIcon.asClassNameArray = asClassNameArray;
    function asClassName(icon) {
        return asClassNameArray(icon).join(' ');
    }
    ThemeIcon.asClassName = asClassName;
    function asCSSSelector(icon) {
        return '.' + asClassNameArray(icon).join('.');
    }
    ThemeIcon.asCSSSelector = asCSSSelector;
    function isThemeIcon(obj) {
        return (obj &&
            typeof obj === 'object' &&
            typeof obj.id === 'string' &&
            (typeof obj.color === 'undefined' ||
                ThemeColor.isThemeColor(obj.color)));
    }
    ThemeIcon.isThemeIcon = isThemeIcon;
    const _regexFromString = new RegExp(`^\\$\\((${ThemeIcon.iconNameExpression}(?:${ThemeIcon.iconModifierExpression})?)\\)$`);
    function fromString(str) {
        const match = _regexFromString.exec(str);
        if (!match) {
            return undefined;
        }
        const [, name] = match;
        return { id: name };
    }
    ThemeIcon.fromString = fromString;
    function fromId(id) {
        return { id };
    }
    ThemeIcon.fromId = fromId;
    function modify(icon, modifier) {
        let id = icon.id;
        const tildeIndex = id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            id = id.substring(0, tildeIndex);
        }
        if (modifier) {
            id = `${id}~${modifier}`;
        }
        return { id };
    }
    ThemeIcon.modify = modify;
    function getModifier(icon) {
        const tildeIndex = icon.id.lastIndexOf('~');
        if (tildeIndex !== -1) {
            return icon.id.substring(tildeIndex + 1);
        }
        return undefined;
    }
    ThemeIcon.getModifier = getModifier;
    function isEqual(ti1, ti2) {
        return ti1.id === ti2.id && ti1.color?.id === ti2.color?.id;
    }
    ThemeIcon.isEqual = isEqual;
})(ThemeIcon || (ThemeIcon = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWFibGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdGhlbWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFVdkMsTUFBTSxLQUFXLFVBQVUsQ0FJMUI7QUFKRCxXQUFpQixVQUFVO0lBQzFCLFNBQWdCLFlBQVksQ0FBQyxHQUFRO1FBQ3BDLE9BQU8sR0FBRyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxPQUFvQixHQUFJLENBQUMsRUFBRSxLQUFLLFFBQVEsQ0FBQTtJQUNsRixDQUFDO0lBRmUsdUJBQVksZUFFM0IsQ0FBQTtBQUNGLENBQUMsRUFKZ0IsVUFBVSxLQUFWLFVBQVUsUUFJMUI7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsRUFBbUI7SUFDbkQsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFBO0FBQ2QsQ0FBQztBQU9ELE1BQU0sS0FBVyxTQUFTLENBK0V6QjtBQS9FRCxXQUFpQixTQUFTO0lBQ1oseUJBQWUsR0FBRyxjQUFjLENBQUE7SUFDaEMsNEJBQWtCLEdBQUcsZUFBZSxDQUFBO0lBQ3BDLGdDQUFzQixHQUFHLFlBQVksQ0FBQTtJQUNyQywyQkFBaUIsR0FBRyxlQUFlLENBQUE7SUFFaEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxLQUFLLFVBQUEsa0JBQWtCLEtBQUssVUFBQSxzQkFBc0IsS0FBSyxDQUFDLENBQUE7SUFFNUYsU0FBZ0IsZ0JBQWdCLENBQUMsSUFBZTtRQUMvQyxNQUFNLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sZ0JBQWdCLENB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