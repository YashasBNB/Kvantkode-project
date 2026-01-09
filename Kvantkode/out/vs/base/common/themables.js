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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWFibGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi90aGVtYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQVV2QyxNQUFNLEtBQVcsVUFBVSxDQUkxQjtBQUpELFdBQWlCLFVBQVU7SUFDMUIsU0FBZ0IsWUFBWSxDQUFDLEdBQVE7UUFDcEMsT0FBTyxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQW9CLEdBQUksQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFBO0lBQ2xGLENBQUM7SUFGZSx1QkFBWSxlQUUzQixDQUFBO0FBQ0YsQ0FBQyxFQUpnQixVQUFVLEtBQVYsVUFBVSxRQUkxQjtBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxFQUFtQjtJQUNuRCxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUE7QUFDZCxDQUFDO0FBT0QsTUFBTSxLQUFXLFNBQVMsQ0ErRXpCO0FBL0VELFdBQWlCLFNBQVM7SUFDWix5QkFBZSxHQUFHLGNBQWMsQ0FBQTtJQUNoQyw0QkFBa0IsR0FBRyxlQUFlLENBQUE7SUFDcEMsZ0NBQXNCLEdBQUcsWUFBWSxDQUFBO0lBQ3JDLDJCQUFpQixHQUFHLGVBQWUsQ0FBQTtJQUVoRCxNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssVUFBQSxrQkFBa0IsS0FBSyxVQUFBLHNCQUFzQixLQUFLLENBQUMsQ0FBQTtJQUU1RixTQUFnQixnQkFBZ0IsQ0FBQyxJQUFlO1FBQy9DLE1BQU0sS0FBSyxHQUFHLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDNUMsSUFBSSxDQUFDLEtBQUssRUFBRSxD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