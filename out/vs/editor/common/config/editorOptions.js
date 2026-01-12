/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import * as objects from '../../../base/common/objects.js';
import * as platform from '../../../base/common/platform.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import { USUAL_WORD_SEPARATORS } from '../core/wordHelper.js';
import * as nls from '../../../nls.js';
import product from '../../../platform/product/common/product.js';
/**
 * Configuration options for auto indentation in the editor
 */
export var EditorAutoIndentStrategy;
(function (EditorAutoIndentStrategy) {
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["None"] = 0] = "None";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Keep"] = 1] = "Keep";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Brackets"] = 2] = "Brackets";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Advanced"] = 3] = "Advanced";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Full"] = 4] = "Full";
})(EditorAutoIndentStrategy || (EditorAutoIndentStrategy = {}));
/**
 * @internal
 * The width of the minimap gutter, in pixels.
 */
export const MINIMAP_GUTTER_WIDTH = 8;
//#endregion
/**
 * An event describing that the configuration of the editor has changed.
 */
export class ConfigurationChangedEvent {
    /**
     * @internal
     */
    constructor(values) {
        this._values = values;
    }
    hasChanged(id) {
        return this._values[id];
    }
}
/**
 * @internal
 */
export class ComputeOptionsMemory {
    constructor() {
        this.stableMinimapLayoutInput = null;
        this.stableFitMaxMinimapScale = 0;
        this.stableFitRemainingWidth = 0;
    }
}
/**
 * @internal
 */
class BaseEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    compute(env, options, value) {
        return value;
    }
}
export class ApplyUpdateResult {
    constructor(newValue, didChange) {
        this.newValue = newValue;
        this.didChange = didChange;
    }
}
function applyUpdate(value, update) {
    if (typeof value !== 'object' || typeof update !== 'object' || !value || !update) {
        return new ApplyUpdateResult(update, value !== update);
    }
    if (Array.isArray(value) || Array.isArray(update)) {
        const arrayEquals = Array.isArray(value) && Array.isArray(update) && arrays.equals(value, update);
        return new ApplyUpdateResult(update, !arrayEquals);
    }
    let didChange = false;
    for (const key in update) {
        if (update.hasOwnProperty(key)) {
            const result = applyUpdate(value[key], update[key]);
            if (result.didChange) {
                value[key] = result.newValue;
                didChange = true;
            }
        }
    }
    return new ApplyUpdateResult(value, didChange);
}
/**
 * @internal
 */
class ComputedEditorOption {
    constructor(id) {
        this.schema = undefined;
        this.id = id;
        this.name = '_never_';
        this.defaultValue = undefined;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        return this.defaultValue;
    }
}
class SimpleEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        return input;
    }
    compute(env, options, value) {
        return value;
    }
}
/**
 * @internal
 */
export function boolean(value, defaultValue) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    if (value === 'false') {
        // treat the string 'false' as false
        return false;
    }
    return Boolean(value);
}
class EditorBooleanOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'boolean';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return boolean(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function clampedInt(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    let r = parseInt(value, 10);
    if (isNaN(r)) {
        return defaultValue;
    }
    r = Math.max(minimum, r);
    r = Math.min(maximum, r);
    return r | 0;
}
class EditorIntOption extends SimpleEditorOption {
    static clampedInt(value, defaultValue, minimum, maximum) {
        return clampedInt(value, defaultValue, minimum, maximum);
    }
    constructor(id, name, defaultValue, minimum, maximum, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'integer';
            schema.default = defaultValue;
            schema.minimum = minimum;
            schema.maximum = maximum;
        }
        super(id, name, defaultValue, schema);
        this.minimum = minimum;
        this.maximum = maximum;
    }
    validate(input) {
        return EditorIntOption.clampedInt(input, this.defaultValue, this.minimum, this.maximum);
    }
}
/**
 * @internal
 */
export function clampedFloat(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    const r = EditorFloatOption.float(value, defaultValue);
    return EditorFloatOption.clamp(r, minimum, maximum);
}
class EditorFloatOption extends SimpleEditorOption {
    static clamp(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    static float(value, defaultValue) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'undefined') {
            return defaultValue;
        }
        const r = parseFloat(value);
        return isNaN(r) ? defaultValue : r;
    }
    constructor(id, name, defaultValue, validationFn, schema) {
        if (typeof schema !== 'undefined') {
            schema.type = 'number';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
        this.validationFn = validationFn;
    }
    validate(input) {
        return this.validationFn(EditorFloatOption.float(input, this.defaultValue));
    }
}
class EditorStringOption extends SimpleEditorOption {
    static string(value, defaultValue) {
        if (typeof value !== 'string') {
            return defaultValue;
        }
        return value;
    }
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return EditorStringOption.string(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function stringSet(value, defaultValue, allowedValues, renamedValues) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (renamedValues && value in renamedValues) {
        return renamedValues[value];
    }
    if (allowedValues.indexOf(value) === -1) {
        return defaultValue;
    }
    return value;
}
class EditorStringEnumOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, allowedValues, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
    }
    validate(input) {
        return stringSet(input, this.defaultValue, this._allowedValues);
    }
}
class EditorEnumOption extends BaseEditorOption {
    constructor(id, name, defaultValue, defaultStringValue, allowedValues, convert, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultStringValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
        this._convert = convert;
    }
    validate(input) {
        if (typeof input !== 'string') {
            return this.defaultValue;
        }
        if (this._allowedValues.indexOf(input) === -1) {
            return this.defaultValue;
        }
        return this._convert(input);
    }
}
//#endregion
//#region autoIndent
function _autoIndentFromString(autoIndent) {
    switch (autoIndent) {
        case 'none':
            return 0 /* EditorAutoIndentStrategy.None */;
        case 'keep':
            return 1 /* EditorAutoIndentStrategy.Keep */;
        case 'brackets':
            return 2 /* EditorAutoIndentStrategy.Brackets */;
        case 'advanced':
            return 3 /* EditorAutoIndentStrategy.Advanced */;
        case 'full':
            return 4 /* EditorAutoIndentStrategy.Full */;
    }
}
//#endregion
//#region accessibilitySupport
class EditorAccessibilitySupport extends BaseEditorOption {
    constructor() {
        super(2 /* EditorOption.accessibilitySupport */, 'accessibilitySupport', 0 /* AccessibilitySupport.Unknown */, {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            enumDescriptions: [
                nls.localize('accessibilitySupport.auto', 'Use platform APIs to detect when a Screen Reader is attached.'),
                nls.localize('accessibilitySupport.on', 'Optimize for usage with a Screen Reader.'),
                nls.localize('accessibilitySupport.off', 'Assume a screen reader is not attached.'),
            ],
            default: 'auto',
            tags: ['accessibility'],
            description: nls.localize('accessibilitySupport', 'Controls if the UI should run in a mode where it is optimized for screen readers.'),
        });
    }
    validate(input) {
        switch (input) {
            case 'auto':
                return 0 /* AccessibilitySupport.Unknown */;
            case 'off':
                return 1 /* AccessibilitySupport.Disabled */;
            case 'on':
                return 2 /* AccessibilitySupport.Enabled */;
        }
        return this.defaultValue;
    }
    compute(env, options, value) {
        if (value === 0 /* AccessibilitySupport.Unknown */) {
            // The editor reads the `accessibilitySupport` from the environment
            return env.accessibilitySupport;
        }
        return value;
    }
}
class EditorComments extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertSpace: true,
            ignoreEmptyLines: true,
        };
        super(23 /* EditorOption.comments */, 'comments', defaults, {
            'editor.comments.insertSpace': {
                type: 'boolean',
                default: defaults.insertSpace,
                description: nls.localize('comments.insertSpace', 'Controls whether a space character is inserted when commenting.'),
            },
            'editor.comments.ignoreEmptyLines': {
                type: 'boolean',
                default: defaults.ignoreEmptyLines,
                description: nls.localize('comments.ignoreEmptyLines', 'Controls if empty lines should be ignored with toggle, add or remove actions for line comments.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertSpace: boolean(input.insertSpace, this.defaultValue.insertSpace),
            ignoreEmptyLines: boolean(input.ignoreEmptyLines, this.defaultValue.ignoreEmptyLines),
        };
    }
}
//#endregion
//#region cursorBlinking
/**
 * The kind of animation in which the editor's cursor should be rendered.
 */
export var TextEditorCursorBlinkingStyle;
(function (TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Hidden"] = 0] = "Hidden";
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Blink"] = 1] = "Blink";
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Smooth"] = 2] = "Smooth";
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Phase"] = 3] = "Phase";
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Expand"] = 4] = "Expand";
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Solid"] = 5] = "Solid";
})(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
/**
 * @internal
 */
export function cursorBlinkingStyleFromString(cursorBlinkingStyle) {
    switch (cursorBlinkingStyle) {
        case 'blink':
            return 1 /* TextEditorCursorBlinkingStyle.Blink */;
        case 'smooth':
            return 2 /* TextEditorCursorBlinkingStyle.Smooth */;
        case 'phase':
            return 3 /* TextEditorCursorBlinkingStyle.Phase */;
        case 'expand':
            return 4 /* TextEditorCursorBlinkingStyle.Expand */;
        case 'solid':
            return 5 /* TextEditorCursorBlinkingStyle.Solid */;
    }
}
//#endregion
//#region cursorStyle
/**
 * The style in which the editor's cursor should be rendered.
 */
export var TextEditorCursorStyle;
(function (TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Line"] = 1] = "Line";
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Block"] = 2] = "Block";
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Underline"] = 3] = "Underline";
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["LineThin"] = 4] = "LineThin";
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["BlockOutline"] = 5] = "BlockOutline";
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["UnderlineThin"] = 6] = "UnderlineThin";
})(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
/**
 * @internal
 */
export function cursorStyleToString(cursorStyle) {
    switch (cursorStyle) {
        case TextEditorCursorStyle.Line:
            return 'line';
        case TextEditorCursorStyle.Block:
            return 'block';
        case TextEditorCursorStyle.Underline:
            return 'underline';
        case TextEditorCursorStyle.LineThin:
            return 'line-thin';
        case TextEditorCursorStyle.BlockOutline:
            return 'block-outline';
        case TextEditorCursorStyle.UnderlineThin:
            return 'underline-thin';
    }
}
/**
 * @internal
 */
export function cursorStyleFromString(cursorStyle) {
    switch (cursorStyle) {
        case 'line':
            return TextEditorCursorStyle.Line;
        case 'block':
            return TextEditorCursorStyle.Block;
        case 'underline':
            return TextEditorCursorStyle.Underline;
        case 'line-thin':
            return TextEditorCursorStyle.LineThin;
        case 'block-outline':
            return TextEditorCursorStyle.BlockOutline;
        case 'underline-thin':
            return TextEditorCursorStyle.UnderlineThin;
    }
}
//#endregion
//#region editorClassName
class EditorClassName extends ComputedEditorOption {
    constructor() {
        super(148 /* EditorOption.editorClassName */);
    }
    compute(env, options, _) {
        const classNames = ['monaco-editor'];
        if (options.get(41 /* EditorOption.extraEditorClassName */)) {
            classNames.push(options.get(41 /* EditorOption.extraEditorClassName */));
        }
        if (env.extraEditorClassName) {
            classNames.push(env.extraEditorClassName);
        }
        if (options.get(75 /* EditorOption.mouseStyle */) === 'default') {
            classNames.push('mouse-default');
        }
        else if (options.get(75 /* EditorOption.mouseStyle */) === 'copy') {
            classNames.push('mouse-copy');
        }
        if (options.get(116 /* EditorOption.showUnused */)) {
            classNames.push('showUnused');
        }
        if (options.get(145 /* EditorOption.showDeprecated */)) {
            classNames.push('showDeprecated');
        }
        return classNames.join(' ');
    }
}
//#endregion
//#region emptySelectionClipboard
class EditorEmptySelectionClipboard extends EditorBooleanOption {
    constructor() {
        super(38 /* EditorOption.emptySelectionClipboard */, 'emptySelectionClipboard', true, {
            description: nls.localize('emptySelectionClipboard', 'Controls whether copying without a selection copies the current line.'),
        });
    }
    compute(env, options, value) {
        return value && env.emptySelectionClipboard;
    }
}
class EditorFind extends BaseEditorOption {
    constructor() {
        const defaults = {
            cursorMoveOnType: true,
            seedSearchStringFromSelection: 'always',
            autoFindInSelection: 'never',
            globalFindClipboard: false,
            addExtraSpaceOnTop: true,
            loop: true,
            history: 'workspace',
            replaceHistory: 'workspace',
        };
        super(43 /* EditorOption.find */, 'find', defaults, {
            'editor.find.cursorMoveOnType': {
                type: 'boolean',
                default: defaults.cursorMoveOnType,
                description: nls.localize('find.cursorMoveOnType', 'Controls whether the cursor should jump to find matches while typing.'),
            },
            'editor.find.seedSearchStringFromSelection': {
                type: 'string',
                enum: ['never', 'always', 'selection'],
                default: defaults.seedSearchStringFromSelection,
                enumDescriptions: [
                    nls.localize('editor.find.seedSearchStringFromSelection.never', 'Never seed search string from the editor selection.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.always', 'Always seed search string from the editor selection, including word at cursor position.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.selection', 'Only seed search string from the editor selection.'),
                ],
                description: nls.localize('find.seedSearchStringFromSelection', 'Controls whether the search string in the Find Widget is seeded from the editor selection.'),
            },
            'editor.find.autoFindInSelection': {
                type: 'string',
                enum: ['never', 'always', 'multiline'],
                default: defaults.autoFindInSelection,
                enumDescriptions: [
                    nls.localize('editor.find.autoFindInSelection.never', 'Never turn on Find in Selection automatically (default).'),
                    nls.localize('editor.find.autoFindInSelection.always', 'Always turn on Find in Selection automatically.'),
                    nls.localize('editor.find.autoFindInSelection.multiline', 'Turn on Find in Selection automatically when multiple lines of content are selected.'),
                ],
                description: nls.localize('find.autoFindInSelection', 'Controls the condition for turning on Find in Selection automatically.'),
            },
            'editor.find.globalFindClipboard': {
                type: 'boolean',
                default: defaults.globalFindClipboard,
                description: nls.localize('find.globalFindClipboard', 'Controls whether the Find Widget should read or modify the shared find clipboard on macOS.'),
                included: platform.isMacintosh,
            },
            'editor.find.addExtraSpaceOnTop': {
                type: 'boolean',
                default: defaults.addExtraSpaceOnTop,
                description: nls.localize('find.addExtraSpaceOnTop', 'Controls whether the Find Widget should add extra lines on top of the editor. When true, you can scroll beyond the first line when the Find Widget is visible.'),
            },
            'editor.find.loop': {
                type: 'boolean',
                default: defaults.loop,
                description: nls.localize('find.loop', 'Controls whether the search automatically restarts from the beginning (or the end) when no further matches can be found.'),
            },
            'editor.find.history': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.history.never', 'Do not store search history from the find widget.'),
                    nls.localize('editor.find.history.workspace', 'Store search history across the active workspace'),
                ],
                description: nls.localize('find.history', 'Controls how the find widget history should be stored'),
            },
            'editor.find.replaceHistory': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.replaceHistory.never', 'Do not store history from the replace widget.'),
                    nls.localize('editor.find.replaceHistory.workspace', 'Store replace history across the active workspace'),
                ],
                description: nls.localize('find.replaceHistory', 'Controls how the replace widget history should be stored'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            cursorMoveOnType: boolean(input.cursorMoveOnType, this.defaultValue.cursorMoveOnType),
            seedSearchStringFromSelection: typeof _input.seedSearchStringFromSelection === 'boolean'
                ? _input.seedSearchStringFromSelection
                    ? 'always'
                    : 'never'
                : stringSet(input.seedSearchStringFromSelection, this.defaultValue.seedSearchStringFromSelection, ['never', 'always', 'selection']),
            autoFindInSelection: typeof _input.autoFindInSelection === 'boolean'
                ? _input.autoFindInSelection
                    ? 'always'
                    : 'never'
                : stringSet(input.autoFindInSelection, this.defaultValue.autoFindInSelection, ['never', 'always', 'multiline']),
            globalFindClipboard: boolean(input.globalFindClipboard, this.defaultValue.globalFindClipboard),
            addExtraSpaceOnTop: boolean(input.addExtraSpaceOnTop, this.defaultValue.addExtraSpaceOnTop),
            loop: boolean(input.loop, this.defaultValue.loop),
            history: stringSet(input.history, this.defaultValue.history, [
                'never',
                'workspace',
            ]),
            replaceHistory: stringSet(input.replaceHistory, this.defaultValue.replaceHistory, ['never', 'workspace']),
        };
    }
}
//#endregion
//#region fontLigatures
/**
 * @internal
 */
export class EditorFontLigatures extends BaseEditorOption {
    static { this.OFF = '"liga" off, "calt" off'; }
    static { this.ON = '"liga" on, "calt" on'; }
    constructor() {
        super(53 /* EditorOption.fontLigatures */, 'fontLigatures', EditorFontLigatures.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontLigatures', "Enables/Disables font ligatures ('calt' and 'liga' font features). Change this to a string for fine-grained control of the 'font-feature-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontFeatureSettings', "Explicit 'font-feature-settings' CSS property. A boolean can be passed instead if one only needs to turn on/off ligatures."),
                },
            ],
            description: nls.localize('fontLigaturesGeneral', "Configures font ligatures or font features. Can be either a boolean to enable/disable ligatures or a string for the value of the CSS 'font-feature-settings' property."),
            default: false,
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false' || input.length === 0) {
                return EditorFontLigatures.OFF;
            }
            if (input === 'true') {
                return EditorFontLigatures.ON;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontLigatures.ON;
        }
        return EditorFontLigatures.OFF;
    }
}
//#endregion
//#region fontVariations
/**
 * @internal
 */
export class EditorFontVariations extends BaseEditorOption {
    // Text is laid out using default settings.
    static { this.OFF = 'normal'; }
    // Translate `fontWeight` config to the `font-variation-settings` CSS property.
    static { this.TRANSLATE = 'translate'; }
    constructor() {
        super(56 /* EditorOption.fontVariations */, 'fontVariations', EditorFontVariations.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontVariations', "Enables/Disables the translation from font-weight to font-variation-settings. Change this to a string for fine-grained control of the 'font-variation-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontVariationSettings', "Explicit 'font-variation-settings' CSS property. A boolean can be passed instead if one only needs to translate font-weight to font-variation-settings."),
                },
            ],
            description: nls.localize('fontVariationsGeneral', "Configures font variations. Can be either a boolean to enable/disable the translation from font-weight to font-variation-settings or a string for the value of the CSS 'font-variation-settings' property."),
            default: false,
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false') {
                return EditorFontVariations.OFF;
            }
            if (input === 'true') {
                return EditorFontVariations.TRANSLATE;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontVariations.TRANSLATE;
        }
        return EditorFontVariations.OFF;
    }
    compute(env, options, value) {
        // The value is computed from the fontWeight if it is true.
        // So take the result from env.fontInfo
        return env.fontInfo.fontVariationSettings;
    }
}
//#endregion
//#region fontInfo
class EditorFontInfo extends ComputedEditorOption {
    constructor() {
        super(52 /* EditorOption.fontInfo */);
    }
    compute(env, options, _) {
        return env.fontInfo;
    }
}
//#endregion
//#region effectiveCursorStyle
class EffectiveCursorStyle extends ComputedEditorOption {
    constructor() {
        super(147 /* EditorOption.effectiveCursorStyle */);
    }
    compute(env, options, _) {
        return env.inputMode === 'overtype'
            ? options.get(84 /* EditorOption.overtypeCursorStyle */)
            : options.get(28 /* EditorOption.cursorStyle */);
    }
}
//#endregion
//#region effectiveExperimentalEditContext
class EffectiveExperimentalEditContextEnabled extends ComputedEditorOption {
    constructor() {
        super(156 /* EditorOption.effectiveExperimentalEditContextEnabled */);
    }
    compute(env, options) {
        const editContextSupported = typeof globalThis.EditContext === 'function';
        return editContextSupported && options.get(37 /* EditorOption.experimentalEditContextEnabled */);
    }
}
//#endregion
//#region fontSize
class EditorFontSize extends SimpleEditorOption {
    constructor() {
        super(54 /* EditorOption.fontSize */, 'fontSize', EDITOR_FONT_DEFAULTS.fontSize, {
            type: 'number',
            minimum: 6,
            maximum: 100,
            default: EDITOR_FONT_DEFAULTS.fontSize,
            description: nls.localize('fontSize', 'Controls the font size in pixels.'),
        });
    }
    validate(input) {
        const r = EditorFloatOption.float(input, this.defaultValue);
        if (r === 0) {
            return EDITOR_FONT_DEFAULTS.fontSize;
        }
        return EditorFloatOption.clamp(r, 6, 100);
    }
    compute(env, options, value) {
        // The final fontSize respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.fontSize;
    }
}
//#endregion
//#region fontWeight
class EditorFontWeight extends BaseEditorOption {
    static { this.SUGGESTION_VALUES = [
        'normal',
        'bold',
        '100',
        '200',
        '300',
        '400',
        '500',
        '600',
        '700',
        '800',
        '900',
    ]; }
    static { this.MINIMUM_VALUE = 1; }
    static { this.MAXIMUM_VALUE = 1000; }
    constructor() {
        super(55 /* EditorOption.fontWeight */, 'fontWeight', EDITOR_FONT_DEFAULTS.fontWeight, {
            anyOf: [
                {
                    type: 'number',
                    minimum: EditorFontWeight.MINIMUM_VALUE,
                    maximum: EditorFontWeight.MAXIMUM_VALUE,
                    errorMessage: nls.localize('fontWeightErrorMessage', 'Only "normal" and "bold" keywords or numbers between 1 and 1000 are allowed.'),
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$',
                },
                {
                    enum: EditorFontWeight.SUGGESTION_VALUES,
                },
            ],
            default: EDITOR_FONT_DEFAULTS.fontWeight,
            description: nls.localize('fontWeight', 'Controls the font weight. Accepts "normal" and "bold" keywords or numbers between 1 and 1000.'),
        });
    }
    validate(input) {
        if (input === 'normal' || input === 'bold') {
            return input;
        }
        return String(EditorIntOption.clampedInt(input, EDITOR_FONT_DEFAULTS.fontWeight, EditorFontWeight.MINIMUM_VALUE, EditorFontWeight.MAXIMUM_VALUE));
    }
}
class EditorGoToLocation extends BaseEditorOption {
    constructor() {
        const defaults = {
            multiple: 'peek',
            multipleDefinitions: 'peek',
            multipleTypeDefinitions: 'peek',
            multipleDeclarations: 'peek',
            multipleImplementations: 'peek',
            multipleReferences: 'peek',
            multipleTests: 'peek',
            alternativeDefinitionCommand: 'editor.action.goToReferences',
            alternativeTypeDefinitionCommand: 'editor.action.goToReferences',
            alternativeDeclarationCommand: 'editor.action.goToReferences',
            alternativeImplementationCommand: '',
            alternativeReferenceCommand: '',
            alternativeTestsCommand: '',
        };
        const jsonSubset = {
            type: 'string',
            enum: ['peek', 'gotoAndPeek', 'goto'],
            default: defaults.multiple,
            enumDescriptions: [
                nls.localize('editor.gotoLocation.multiple.peek', 'Show Peek view of the results (default)'),
                nls.localize('editor.gotoLocation.multiple.gotoAndPeek', 'Go to the primary result and show a Peek view'),
                nls.localize('editor.gotoLocation.multiple.goto', 'Go to the primary result and enable Peek-less navigation to others'),
            ],
        };
        const alternativeCommandOptions = [
            '',
            'editor.action.referenceSearch.trigger',
            'editor.action.goToReferences',
            'editor.action.peekImplementation',
            'editor.action.goToImplementation',
            'editor.action.peekTypeDefinition',
            'editor.action.goToTypeDefinition',
            'editor.action.peekDeclaration',
            'editor.action.revealDeclaration',
            'editor.action.peekDefinition',
            'editor.action.revealDefinitionAside',
            'editor.action.revealDefinition',
        ];
        super(60 /* EditorOption.gotoLocation */, 'gotoLocation', defaults, {
            'editor.gotoLocation.multiple': {
                deprecationMessage: nls.localize('editor.gotoLocation.multiple.deprecated', "This setting is deprecated, please use separate settings like 'editor.editor.gotoLocation.multipleDefinitions' or 'editor.editor.gotoLocation.multipleImplementations' instead."),
            },
            'editor.gotoLocation.multipleDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleDefinitions', "Controls the behavior the 'Go to Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleTypeDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleTypeDefinitions', "Controls the behavior the 'Go to Type Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleDeclarations': {
                description: nls.localize('editor.editor.gotoLocation.multipleDeclarations', "Controls the behavior the 'Go to Declaration'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleImplementations': {
                description: nls.localize('editor.editor.gotoLocation.multipleImplemenattions', "Controls the behavior the 'Go to Implementations'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleReferences': {
                description: nls.localize('editor.editor.gotoLocation.multipleReferences', "Controls the behavior the 'Go to References'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.alternativeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Definition' is the current location."),
            },
            'editor.gotoLocation.alternativeTypeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeTypeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeTypeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Type Definition' is the current location."),
            },
            'editor.gotoLocation.alternativeDeclarationCommand': {
                type: 'string',
                default: defaults.alternativeDeclarationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDeclarationCommand', "Alternative command id that is being executed when the result of 'Go to Declaration' is the current location."),
            },
            'editor.gotoLocation.alternativeImplementationCommand': {
                type: 'string',
                default: defaults.alternativeImplementationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeImplementationCommand', "Alternative command id that is being executed when the result of 'Go to Implementation' is the current location."),
            },
            'editor.gotoLocation.alternativeReferenceCommand': {
                type: 'string',
                default: defaults.alternativeReferenceCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeReferenceCommand', "Alternative command id that is being executed when the result of 'Go to Reference' is the current location."),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            multiple: stringSet(input.multiple, this.defaultValue.multiple, [
                'peek',
                'gotoAndPeek',
                'goto',
            ]),
            multipleDefinitions: input.multipleDefinitions ??
                stringSet(input.multipleDefinitions, 'peek', [
                    'peek',
                    'gotoAndPeek',
                    'goto',
                ]),
            multipleTypeDefinitions: input.multipleTypeDefinitions ??
                stringSet(input.multipleTypeDefinitions, 'peek', [
                    'peek',
                    'gotoAndPeek',
                    'goto',
                ]),
            multipleDeclarations: input.multipleDeclarations ??
                stringSet(input.multipleDeclarations, 'peek', [
                    'peek',
                    'gotoAndPeek',
                    'goto',
                ]),
            multipleImplementations: input.multipleImplementations ??
                stringSet(input.multipleImplementations, 'peek', [
                    'peek',
                    'gotoAndPeek',
                    'goto',
                ]),
            multipleReferences: input.multipleReferences ??
                stringSet(input.multipleReferences, 'peek', [
                    'peek',
                    'gotoAndPeek',
                    'goto',
                ]),
            multipleTests: input.multipleTests ??
                stringSet(input.multipleTests, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            alternativeDefinitionCommand: EditorStringOption.string(input.alternativeDefinitionCommand, this.defaultValue.alternativeDefinitionCommand),
            alternativeTypeDefinitionCommand: EditorStringOption.string(input.alternativeTypeDefinitionCommand, this.defaultValue.alternativeTypeDefinitionCommand),
            alternativeDeclarationCommand: EditorStringOption.string(input.alternativeDeclarationCommand, this.defaultValue.alternativeDeclarationCommand),
            alternativeImplementationCommand: EditorStringOption.string(input.alternativeImplementationCommand, this.defaultValue.alternativeImplementationCommand),
            alternativeReferenceCommand: EditorStringOption.string(input.alternativeReferenceCommand, this.defaultValue.alternativeReferenceCommand),
            alternativeTestsCommand: EditorStringOption.string(input.alternativeTestsCommand, this.defaultValue.alternativeTestsCommand),
        };
    }
}
class EditorHover extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            delay: 300,
            hidingDelay: 300,
            sticky: true,
            above: true,
        };
        super(62 /* EditorOption.hover */, 'hover', defaults, {
            'editor.hover.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('hover.enabled', 'Controls whether the hover is shown.'),
            },
            'editor.hover.delay': {
                type: 'number',
                default: defaults.delay,
                minimum: 0,
                maximum: 10000,
                description: nls.localize('hover.delay', 'Controls the delay in milliseconds after which the hover is shown.'),
            },
            'editor.hover.sticky': {
                type: 'boolean',
                default: defaults.sticky,
                description: nls.localize('hover.sticky', 'Controls whether the hover should remain visible when mouse is moved over it.'),
            },
            'editor.hover.hidingDelay': {
                type: 'integer',
                minimum: 0,
                default: defaults.hidingDelay,
                description: nls.localize('hover.hidingDelay', 'Controls the delay in milliseconds after which the hover is hidden. Requires `editor.hover.sticky` to be enabled.'),
            },
            'editor.hover.above': {
                type: 'boolean',
                default: defaults.above,
                description: nls.localize('hover.above', "Prefer showing hovers above the line, if there's space."),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            delay: EditorIntOption.clampedInt(input.delay, this.defaultValue.delay, 0, 10000),
            sticky: boolean(input.sticky, this.defaultValue.sticky),
            hidingDelay: EditorIntOption.clampedInt(input.hidingDelay, this.defaultValue.hidingDelay, 0, 600000),
            above: boolean(input.above, this.defaultValue.above),
        };
    }
}
export var RenderMinimap;
(function (RenderMinimap) {
    RenderMinimap[RenderMinimap["None"] = 0] = "None";
    RenderMinimap[RenderMinimap["Text"] = 1] = "Text";
    RenderMinimap[RenderMinimap["Blocks"] = 2] = "Blocks";
})(RenderMinimap || (RenderMinimap = {}));
/**
 * @internal
 */
export class EditorLayoutInfoComputer extends ComputedEditorOption {
    constructor() {
        super(151 /* EditorOption.layoutInfo */);
    }
    compute(env, options, _) {
        return EditorLayoutInfoComputer.computeLayout(options, {
            memory: env.memory,
            outerWidth: env.outerWidth,
            outerHeight: env.outerHeight,
            isDominatedByLongLines: env.isDominatedByLongLines,
            lineHeight: env.fontInfo.lineHeight,
            viewLineCount: env.viewLineCount,
            lineNumbersDigitCount: env.lineNumbersDigitCount,
            typicalHalfwidthCharacterWidth: env.fontInfo.typicalHalfwidthCharacterWidth,
            maxDigitWidth: env.fontInfo.maxDigitWidth,
            pixelRatio: env.pixelRatio,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount,
        });
    }
    static computeContainedMinimapLineCount(input) {
        const typicalViewportLineCount = input.height / input.lineHeight;
        const extraLinesBeforeFirstLine = Math.floor(input.paddingTop / input.lineHeight);
        let extraLinesBeyondLastLine = Math.floor(input.paddingBottom / input.lineHeight);
        if (input.scrollBeyondLastLine) {
            extraLinesBeyondLastLine = Math.max(extraLinesBeyondLastLine, typicalViewportLineCount - 1);
        }
        const desiredRatio = (extraLinesBeforeFirstLine + input.viewLineCount + extraLinesBeyondLastLine) /
            (input.pixelRatio * input.height);
        const minimapLineCount = Math.floor(input.viewLineCount / desiredRatio);
        return {
            typicalViewportLineCount,
            extraLinesBeforeFirstLine,
            extraLinesBeyondLastLine,
            desiredRatio,
            minimapLineCount,
        };
    }
    static _computeMinimapLayout(input, memory) {
        const outerWidth = input.outerWidth;
        const outerHeight = input.outerHeight;
        const pixelRatio = input.pixelRatio;
        if (!input.minimap.enabled) {
            return {
                renderMinimap: 0 /* RenderMinimap.None */,
                minimapLeft: 0,
                minimapWidth: 0,
                minimapHeightIsEditorHeight: false,
                minimapIsSampling: false,
                minimapScale: 1,
                minimapLineHeight: 1,
                minimapCanvasInnerWidth: 0,
                minimapCanvasInnerHeight: Math.floor(pixelRatio * outerHeight),
                minimapCanvasOuterWidth: 0,
                minimapCanvasOuterHeight: outerHeight,
            };
        }
        // Can use memory if only the `viewLineCount` and `remainingWidth` have changed
        const stableMinimapLayoutInput = memory.stableMinimapLayoutInput;
        const couldUseMemory = stableMinimapLayoutInput &&
            // && input.outerWidth === lastMinimapLayoutInput.outerWidth !!! INTENTIONAL OMITTED
            input.outerHeight === stableMinimapLayoutInput.outerHeight &&
            input.lineHeight === stableMinimapLayoutInput.lineHeight &&
            input.typicalHalfwidthCharacterWidth ===
                stableMinimapLayoutInput.typicalHalfwidthCharacterWidth &&
            input.pixelRatio === stableMinimapLayoutInput.pixelRatio &&
            input.scrollBeyondLastLine === stableMinimapLayoutInput.scrollBeyondLastLine &&
            input.paddingTop === stableMinimapLayoutInput.paddingTop &&
            input.paddingBottom === stableMinimapLayoutInput.paddingBottom &&
            input.minimap.enabled === stableMinimapLayoutInput.minimap.enabled &&
            input.minimap.side === stableMinimapLayoutInput.minimap.side &&
            input.minimap.size === stableMinimapLayoutInput.minimap.size &&
            input.minimap.showSlider === stableMinimapLayoutInput.minimap.showSlider &&
            input.minimap.renderCharacters === stableMinimapLayoutInput.minimap.renderCharacters &&
            input.minimap.maxColumn === stableMinimapLayoutInput.minimap.maxColumn &&
            input.minimap.scale === stableMinimapLayoutInput.minimap.scale &&
            input.verticalScrollbarWidth === stableMinimapLayoutInput.verticalScrollbarWidth &&
            // && input.viewLineCount === lastMinimapLayoutInput.viewLineCount !!! INTENTIONAL OMITTED
            // && input.remainingWidth === lastMinimapLayoutInput.remainingWidth !!! INTENTIONAL OMITTED
            input.isViewportWrapping === stableMinimapLayoutInput.isViewportWrapping;
        const lineHeight = input.lineHeight;
        const typicalHalfwidthCharacterWidth = input.typicalHalfwidthCharacterWidth;
        const scrollBeyondLastLine = input.scrollBeyondLastLine;
        const minimapRenderCharacters = input.minimap.renderCharacters;
        let minimapScale = pixelRatio >= 2 ? Math.round(input.minimap.scale * 2) : input.minimap.scale;
        const minimapMaxColumn = input.minimap.maxColumn;
        const minimapSize = input.minimap.size;
        const minimapSide = input.minimap.side;
        const verticalScrollbarWidth = input.verticalScrollbarWidth;
        const viewLineCount = input.viewLineCount;
        const remainingWidth = input.remainingWidth;
        const isViewportWrapping = input.isViewportWrapping;
        const baseCharHeight = minimapRenderCharacters ? 2 : 3;
        let minimapCanvasInnerHeight = Math.floor(pixelRatio * outerHeight);
        const minimapCanvasOuterHeight = minimapCanvasInnerHeight / pixelRatio;
        let minimapHeightIsEditorHeight = false;
        let minimapIsSampling = false;
        let minimapLineHeight = baseCharHeight * minimapScale;
        let minimapCharWidth = minimapScale / pixelRatio;
        let minimapWidthMultiplier = 1;
        if (minimapSize === 'fill' || minimapSize === 'fit') {
            const { typicalViewportLineCount, extraLinesBeforeFirstLine, extraLinesBeyondLastLine, desiredRatio, minimapLineCount, } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
                viewLineCount: viewLineCount,
                scrollBeyondLastLine: scrollBeyondLastLine,
                paddingTop: input.paddingTop,
                paddingBottom: input.paddingBottom,
                height: outerHeight,
                lineHeight: lineHeight,
                pixelRatio: pixelRatio,
            });
            // ratio is intentionally not part of the layout to avoid the layout changing all the time
            // when doing sampling
            const ratio = viewLineCount / minimapLineCount;
            if (ratio > 1) {
                minimapHeightIsEditorHeight = true;
                minimapIsSampling = true;
                minimapScale = 1;
                minimapLineHeight = 1;
                minimapCharWidth = minimapScale / pixelRatio;
            }
            else {
                let fitBecomesFill = false;
                let maxMinimapScale = minimapScale + 1;
                if (minimapSize === 'fit') {
                    const effectiveMinimapHeight = Math.ceil((extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine) *
                        minimapLineHeight);
                    if (isViewportWrapping &&
                        couldUseMemory &&
                        remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fit` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        fitBecomesFill = true;
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    else {
                        fitBecomesFill = effectiveMinimapHeight > minimapCanvasInnerHeight;
                    }
                }
                if (minimapSize === 'fill' || fitBecomesFill) {
                    minimapHeightIsEditorHeight = true;
                    const configuredMinimapScale = minimapScale;
                    minimapLineHeight = Math.min(lineHeight * pixelRatio, Math.max(1, Math.floor(1 / desiredRatio)));
                    if (isViewportWrapping &&
                        couldUseMemory &&
                        remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fill` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    minimapScale = Math.min(maxMinimapScale, Math.max(1, Math.floor(minimapLineHeight / baseCharHeight)));
                    if (minimapScale > configuredMinimapScale) {
                        minimapWidthMultiplier = Math.min(2, minimapScale / configuredMinimapScale);
                    }
                    minimapCharWidth = minimapScale / pixelRatio / minimapWidthMultiplier;
                    minimapCanvasInnerHeight = Math.ceil(Math.max(typicalViewportLineCount, extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine) * minimapLineHeight);
                    if (isViewportWrapping) {
                        // remember for next time
                        memory.stableMinimapLayoutInput = input;
                        memory.stableFitRemainingWidth = remainingWidth;
                        memory.stableFitMaxMinimapScale = minimapScale;
                    }
                    else {
                        memory.stableMinimapLayoutInput = null;
                        memory.stableFitRemainingWidth = 0;
                    }
                }
            }
        }
        // Given:
        // (leaving 2px for the cursor to have space after the last character)
        // viewportColumn = (contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth
        // minimapWidth = viewportColumn * minimapCharWidth
        // contentWidth = remainingWidth - minimapWidth
        // What are good values for contentWidth and minimapWidth ?
        // minimapWidth = ((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (contentWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (remainingWidth - minimapWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // (typicalHalfwidthCharacterWidth + minimapCharWidth) * minimapWidth = (remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // minimapWidth = ((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth)
        const minimapMaxWidth = Math.floor(minimapMaxColumn * minimapCharWidth);
        const minimapWidth = Math.min(minimapMaxWidth, Math.max(0, Math.floor(((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) /
            (typicalHalfwidthCharacterWidth + minimapCharWidth))) + MINIMAP_GUTTER_WIDTH);
        let minimapCanvasInnerWidth = Math.floor(pixelRatio * minimapWidth);
        const minimapCanvasOuterWidth = minimapCanvasInnerWidth / pixelRatio;
        minimapCanvasInnerWidth = Math.floor(minimapCanvasInnerWidth * minimapWidthMultiplier);
        const renderMinimap = minimapRenderCharacters ? 1 /* RenderMinimap.Text */ : 2 /* RenderMinimap.Blocks */;
        const minimapLeft = minimapSide === 'left' ? 0 : outerWidth - minimapWidth - verticalScrollbarWidth;
        return {
            renderMinimap,
            minimapLeft,
            minimapWidth,
            minimapHeightIsEditorHeight,
            minimapIsSampling,
            minimapScale,
            minimapLineHeight,
            minimapCanvasInnerWidth,
            minimapCanvasInnerHeight,
            minimapCanvasOuterWidth,
            minimapCanvasOuterHeight,
        };
    }
    static computeLayout(options, env) {
        const outerWidth = env.outerWidth | 0;
        const outerHeight = env.outerHeight | 0;
        const lineHeight = env.lineHeight | 0;
        const lineNumbersDigitCount = env.lineNumbersDigitCount | 0;
        const typicalHalfwidthCharacterWidth = env.typicalHalfwidthCharacterWidth;
        const maxDigitWidth = env.maxDigitWidth;
        const pixelRatio = env.pixelRatio;
        const viewLineCount = env.viewLineCount;
        const wordWrapOverride2 = options.get(142 /* EditorOption.wordWrapOverride2 */);
        const wordWrapOverride1 = wordWrapOverride2 === 'inherit'
            ? options.get(141 /* EditorOption.wordWrapOverride1 */)
            : wordWrapOverride2;
        const wordWrap = wordWrapOverride1 === 'inherit' ? options.get(137 /* EditorOption.wordWrap */) : wordWrapOverride1;
        const wordWrapColumn = options.get(140 /* EditorOption.wordWrapColumn */);
        const isDominatedByLongLines = env.isDominatedByLongLines;
        const showGlyphMargin = options.get(59 /* EditorOption.glyphMargin */);
        const showLineNumbers = options.get(69 /* EditorOption.lineNumbers */).renderType !== 0 /* RenderLineNumbersType.Off */;
        const lineNumbersMinChars = options.get(70 /* EditorOption.lineNumbersMinChars */);
        const scrollBeyondLastLine = options.get(110 /* EditorOption.scrollBeyondLastLine */);
        const padding = options.get(88 /* EditorOption.padding */);
        const minimap = options.get(74 /* EditorOption.minimap */);
        const scrollbar = options.get(108 /* EditorOption.scrollbar */);
        const verticalScrollbarWidth = scrollbar.verticalScrollbarSize;
        const verticalScrollbarHasArrows = scrollbar.verticalHasArrows;
        const scrollbarArrowSize = scrollbar.arrowSize;
        const horizontalScrollbarHeight = scrollbar.horizontalScrollbarSize;
        const folding = options.get(45 /* EditorOption.folding */);
        const showFoldingDecoration = options.get(115 /* EditorOption.showFoldingControls */) !== 'never';
        let lineDecorationsWidth = options.get(67 /* EditorOption.lineDecorationsWidth */);
        if (folding && showFoldingDecoration) {
            lineDecorationsWidth += 16;
        }
        let lineNumbersWidth = 0;
        if (showLineNumbers) {
            const digitCount = Math.max(lineNumbersDigitCount, lineNumbersMinChars);
            lineNumbersWidth = Math.round(digitCount * maxDigitWidth);
        }
        let glyphMarginWidth = 0;
        if (showGlyphMargin) {
            glyphMarginWidth = lineHeight * env.glyphMarginDecorationLaneCount;
        }
        let glyphMarginLeft = 0;
        let lineNumbersLeft = glyphMarginLeft + glyphMarginWidth;
        let decorationsLeft = lineNumbersLeft + lineNumbersWidth;
        let contentLeft = decorationsLeft + lineDecorationsWidth;
        const remainingWidth = outerWidth - glyphMarginWidth - lineNumbersWidth - lineDecorationsWidth;
        let isWordWrapMinified = false;
        let isViewportWrapping = false;
        let wrappingColumn = -1;
        if (wordWrapOverride1 === 'inherit' && isDominatedByLongLines) {
            // Force viewport width wrapping if model is dominated by long lines
            isWordWrapMinified = true;
            isViewportWrapping = true;
        }
        else if (wordWrap === 'on' || wordWrap === 'bounded') {
            isViewportWrapping = true;
        }
        else if (wordWrap === 'wordWrapColumn') {
            wrappingColumn = wordWrapColumn;
        }
        const minimapLayout = EditorLayoutInfoComputer._computeMinimapLayout({
            outerWidth: outerWidth,
            outerHeight: outerHeight,
            lineHeight: lineHeight,
            typicalHalfwidthCharacterWidth: typicalHalfwidthCharacterWidth,
            pixelRatio: pixelRatio,
            scrollBeyondLastLine: scrollBeyondLastLine,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
            minimap: minimap,
            verticalScrollbarWidth: verticalScrollbarWidth,
            viewLineCount: viewLineCount,
            remainingWidth: remainingWidth,
            isViewportWrapping: isViewportWrapping,
        }, env.memory || new ComputeOptionsMemory());
        if (minimapLayout.renderMinimap !== 0 /* RenderMinimap.None */ && minimapLayout.minimapLeft === 0) {
            // the minimap is rendered to the left, so move everything to the right
            glyphMarginLeft += minimapLayout.minimapWidth;
            lineNumbersLeft += minimapLayout.minimapWidth;
            decorationsLeft += minimapLayout.minimapWidth;
            contentLeft += minimapLayout.minimapWidth;
        }
        const contentWidth = remainingWidth - minimapLayout.minimapWidth;
        // (leaving 2px for the cursor to have space after the last character)
        const viewportColumn = Math.max(1, Math.floor((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth));
        const verticalArrowSize = verticalScrollbarHasArrows ? scrollbarArrowSize : 0;
        if (isViewportWrapping) {
            // compute the actual wrappingColumn
            wrappingColumn = Math.max(1, viewportColumn);
            if (wordWrap === 'bounded') {
                wrappingColumn = Math.min(wrappingColumn, wordWrapColumn);
            }
        }
        return {
            width: outerWidth,
            height: outerHeight,
            glyphMarginLeft: glyphMarginLeft,
            glyphMarginWidth: glyphMarginWidth,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount,
            lineNumbersLeft: lineNumbersLeft,
            lineNumbersWidth: lineNumbersWidth,
            decorationsLeft: decorationsLeft,
            decorationsWidth: lineDecorationsWidth,
            contentLeft: contentLeft,
            contentWidth: contentWidth,
            minimap: minimapLayout,
            viewportColumn: viewportColumn,
            isWordWrapMinified: isWordWrapMinified,
            isViewportWrapping: isViewportWrapping,
            wrappingColumn: wrappingColumn,
            verticalScrollbarWidth: verticalScrollbarWidth,
            horizontalScrollbarHeight: horizontalScrollbarHeight,
            overviewRuler: {
                top: verticalArrowSize,
                width: verticalScrollbarWidth,
                height: outerHeight - 2 * verticalArrowSize,
                right: 0,
            },
        };
    }
}
//#endregion
//#region WrappingStrategy
class WrappingStrategy extends BaseEditorOption {
    constructor() {
        super(144 /* EditorOption.wrappingStrategy */, 'wrappingStrategy', 'simple', {
            'editor.wrappingStrategy': {
                enumDescriptions: [
                    nls.localize('wrappingStrategy.simple', 'Assumes that all characters are of the same width. This is a fast algorithm that works correctly for monospace fonts and certain scripts (like Latin characters) where glyphs are of equal width.'),
                    nls.localize('wrappingStrategy.advanced', 'Delegates wrapping points computation to the browser. This is a slow algorithm, that might cause freezes for large files, but it works correctly in all cases.'),
                ],
                type: 'string',
                enum: ['simple', 'advanced'],
                default: 'simple',
                description: nls.localize('wrappingStrategy', 'Controls the algorithm that computes wrapping points. Note that when in accessibility mode, advanced will be used for the best experience.'),
            },
        });
    }
    validate(input) {
        return stringSet(input, 'simple', ['simple', 'advanced']);
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we switch our strategy to advanced to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 'advanced';
        }
        return value;
    }
}
//#endregion
//#region lightbulb
export var ShowLightbulbIconMode;
(function (ShowLightbulbIconMode) {
    ShowLightbulbIconMode["Off"] = "off";
    ShowLightbulbIconMode["OnCode"] = "onCode";
    ShowLightbulbIconMode["On"] = "on";
})(ShowLightbulbIconMode || (ShowLightbulbIconMode = {}));
class EditorLightbulb extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: ShowLightbulbIconMode.OnCode };
        super(66 /* EditorOption.lightbulb */, 'lightbulb', defaults, {
            'editor.lightbulb.enabled': {
                type: 'string',
                enum: [ShowLightbulbIconMode.Off, ShowLightbulbIconMode.OnCode, ShowLightbulbIconMode.On],
                default: defaults.enabled,
                enumDescriptions: [
                    nls.localize('editor.lightbulb.enabled.off', 'Disable the code action menu.'),
                    nls.localize('editor.lightbulb.enabled.onCode', 'Show the code action menu when the cursor is on lines with code.'),
                    nls.localize('editor.lightbulb.enabled.on', 'Show the code action menu when the cursor is on lines with code or on empty lines.'),
                ],
                description: nls.localize('enabled', 'Enables the Code Action lightbulb in the editor.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, [
                ShowLightbulbIconMode.Off,
                ShowLightbulbIconMode.OnCode,
                ShowLightbulbIconMode.On,
            ]),
        };
    }
}
class EditorStickyScroll extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            maxLineCount: 5,
            defaultModel: 'outlineModel',
            scrollWithEditor: true,
        };
        super(120 /* EditorOption.stickyScroll */, 'stickyScroll', defaults, {
            'editor.stickyScroll.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('editor.stickyScroll.enabled', 'Shows the nested current scopes during the scroll at the top of the editor.'),
            },
            'editor.stickyScroll.maxLineCount': {
                type: 'number',
                default: defaults.maxLineCount,
                minimum: 1,
                maximum: 20,
                description: nls.localize('editor.stickyScroll.maxLineCount', 'Defines the maximum number of sticky lines to show.'),
            },
            'editor.stickyScroll.defaultModel': {
                type: 'string',
                enum: ['outlineModel', 'foldingProviderModel', 'indentationModel'],
                default: defaults.defaultModel,
                description: nls.localize('editor.stickyScroll.defaultModel', 'Defines the model to use for determining which lines to stick. If the outline model does not exist, it will fall back on the folding provider model which falls back on the indentation model. This order is respected in all three cases.'),
            },
            'editor.stickyScroll.scrollWithEditor': {
                type: 'boolean',
                default: defaults.scrollWithEditor,
                description: nls.localize('editor.stickyScroll.scrollWithEditor', "Enable scrolling of Sticky Scroll with the editor's horizontal scrollbar."),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            maxLineCount: EditorIntOption.clampedInt(input.maxLineCount, this.defaultValue.maxLineCount, 1, 20),
            defaultModel: stringSet(input.defaultModel, this.defaultValue.defaultModel, ['outlineModel', 'foldingProviderModel', 'indentationModel']),
            scrollWithEditor: boolean(input.scrollWithEditor, this.defaultValue.scrollWithEditor),
        };
    }
}
class EditorInlayHints extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: 'on',
            fontSize: 0,
            fontFamily: '',
            padding: false,
            maximumLength: 43,
        };
        super(146 /* EditorOption.inlayHints */, 'inlayHints', defaults, {
            'editor.inlayHints.enabled': {
                type: 'string',
                default: defaults.enabled,
                description: nls.localize('inlayHints.enable', 'Enables the inlay hints in the editor.'),
                enum: ['on', 'onUnlessPressed', 'offUnlessPressed', 'off'],
                markdownEnumDescriptions: [
                    nls.localize('editor.inlayHints.on', 'Inlay hints are enabled'),
                    nls.localize('editor.inlayHints.onUnlessPressed', 'Inlay hints are showing by default and hide when holding {0}', platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.offUnlessPressed', 'Inlay hints are hidden by default and show when holding {0}', platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.off', 'Inlay hints are disabled'),
                ],
            },
            'editor.inlayHints.fontSize': {
                type: 'number',
                default: defaults.fontSize,
                markdownDescription: nls.localize('inlayHints.fontSize', 'Controls font size of inlay hints in the editor. As default the {0} is used when the configured value is less than {1} or greater than the editor font size.', '`#editor.fontSize#`', '`5`'),
            },
            'editor.inlayHints.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                markdownDescription: nls.localize('inlayHints.fontFamily', 'Controls font family of inlay hints in the editor. When set to empty, the {0} is used.', '`#editor.fontFamily#`'),
            },
            'editor.inlayHints.padding': {
                type: 'boolean',
                default: defaults.padding,
                description: nls.localize('inlayHints.padding', 'Enables the padding around the inlay hints in the editor.'),
            },
            'editor.inlayHints.maximumLength': {
                type: 'number',
                default: defaults.maximumLength,
                markdownDescription: nls.localize('inlayHints.maximumLength', 'Maximum overall length of inlay hints, for a single line, before they get truncated by the editor. Set to `0` to never truncate'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        if (typeof input.enabled === 'boolean') {
            input.enabled = input.enabled ? 'on' : 'off';
        }
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, ['on', 'off', 'offUnlessPressed', 'onUnlessPressed']),
            fontSize: EditorIntOption.clampedInt(input.fontSize, this.defaultValue.fontSize, 0, 100),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            padding: boolean(input.padding, this.defaultValue.padding),
            maximumLength: EditorIntOption.clampedInt(input.maximumLength, this.defaultValue.maximumLength, 0, Number.MAX_SAFE_INTEGER),
        };
    }
}
//#endregion
//#region lineDecorationsWidth
class EditorLineDecorationsWidth extends BaseEditorOption {
    constructor() {
        super(67 /* EditorOption.lineDecorationsWidth */, 'lineDecorationsWidth', 10);
    }
    validate(input) {
        if (typeof input === 'string' && /^\d+(\.\d+)?ch$/.test(input)) {
            const multiple = parseFloat(input.substring(0, input.length - 2));
            return -multiple; // negative numbers signal a multiple
        }
        else {
            return EditorIntOption.clampedInt(input, this.defaultValue, 0, 1000);
        }
    }
    compute(env, options, value) {
        if (value < 0) {
            // negative numbers signal a multiple
            return EditorIntOption.clampedInt(-value * env.fontInfo.typicalHalfwidthCharacterWidth, this.defaultValue, 0, 1000);
        }
        else {
            return value;
        }
    }
}
//#endregion
//#region lineHeight
class EditorLineHeight extends EditorFloatOption {
    constructor() {
        super(68 /* EditorOption.lineHeight */, 'lineHeight', EDITOR_FONT_DEFAULTS.lineHeight, (x) => EditorFloatOption.clamp(x, 0, 150), {
            markdownDescription: nls.localize('lineHeight', 'Controls the line height. \n - Use 0 to automatically compute the line height from the font size.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values.'),
        });
    }
    compute(env, options, value) {
        // The lineHeight is computed from the fontSize if it is 0.
        // Moreover, the final lineHeight respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.lineHeight;
    }
}
class EditorMinimap extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            size: 'proportional',
            side: 'right',
            showSlider: 'mouseover',
            autohide: false,
            renderCharacters: true,
            maxColumn: 120,
            scale: 1,
            showRegionSectionHeaders: true,
            showMarkSectionHeaders: true,
            markSectionHeaderRegex: '\\bMARK:\\s*(?<separator>\-?)\\s*(?<label>.*)$',
            sectionHeaderFontSize: 9,
            sectionHeaderLetterSpacing: 1,
        };
        super(74 /* EditorOption.minimap */, 'minimap', defaults, {
            'editor.minimap.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('minimap.enabled', 'Controls whether the minimap is shown.'),
            },
            'editor.minimap.autohide': {
                type: 'boolean',
                default: defaults.autohide,
                description: nls.localize('minimap.autohide', 'Controls whether the minimap is hidden automatically.'),
            },
            'editor.minimap.size': {
                type: 'string',
                enum: ['proportional', 'fill', 'fit'],
                enumDescriptions: [
                    nls.localize('minimap.size.proportional', 'The minimap has the same size as the editor contents (and might scroll).'),
                    nls.localize('minimap.size.fill', 'The minimap will stretch or shrink as necessary to fill the height of the editor (no scrolling).'),
                    nls.localize('minimap.size.fit', 'The minimap will shrink as necessary to never be larger than the editor (no scrolling).'),
                ],
                default: defaults.size,
                description: nls.localize('minimap.size', 'Controls the size of the minimap.'),
            },
            'editor.minimap.side': {
                type: 'string',
                enum: ['left', 'right'],
                default: defaults.side,
                description: nls.localize('minimap.side', 'Controls the side where to render the minimap.'),
            },
            'editor.minimap.showSlider': {
                type: 'string',
                enum: ['always', 'mouseover'],
                default: defaults.showSlider,
                description: nls.localize('minimap.showSlider', 'Controls when the minimap slider is shown.'),
            },
            'editor.minimap.scale': {
                type: 'number',
                default: defaults.scale,
                minimum: 1,
                maximum: 3,
                enum: [1, 2, 3],
                description: nls.localize('minimap.scale', 'Scale of content drawn in the minimap: 1, 2 or 3.'),
            },
            'editor.minimap.renderCharacters': {
                type: 'boolean',
                default: defaults.renderCharacters,
                description: nls.localize('minimap.renderCharacters', 'Render the actual characters on a line as opposed to color blocks.'),
            },
            'editor.minimap.maxColumn': {
                type: 'number',
                default: defaults.maxColumn,
                description: nls.localize('minimap.maxColumn', 'Limit the width of the minimap to render at most a certain number of columns.'),
            },
            'editor.minimap.showRegionSectionHeaders': {
                type: 'boolean',
                default: defaults.showRegionSectionHeaders,
                description: nls.localize('minimap.showRegionSectionHeaders', 'Controls whether named regions are shown as section headers in the minimap.'),
            },
            'editor.minimap.showMarkSectionHeaders': {
                type: 'boolean',
                default: defaults.showMarkSectionHeaders,
                description: nls.localize('minimap.showMarkSectionHeaders', 'Controls whether MARK: comments are shown as section headers in the minimap.'),
            },
            'editor.minimap.markSectionHeaderRegex': {
                type: 'string',
                default: defaults.markSectionHeaderRegex,
                description: nls.localize('minimap.markSectionHeaderRegex', 'Defines the regular expression used to find section headers in comments. The regex must contain a named match group `label` (written as `(?<label>.+)`) that encapsulates the section header, otherwise it will not work. Optionally you can include another match group named `separator`. Use \\n in the pattern to match multi-line headers.'),
            },
            'editor.minimap.sectionHeaderFontSize': {
                type: 'number',
                default: defaults.sectionHeaderFontSize,
                description: nls.localize('minimap.sectionHeaderFontSize', 'Controls the font size of section headers in the minimap.'),
            },
            'editor.minimap.sectionHeaderLetterSpacing': {
                type: 'number',
                default: defaults.sectionHeaderLetterSpacing,
                description: nls.localize('minimap.sectionHeaderLetterSpacing', 'Controls the amount of space (in pixels) between characters of section header. This helps the readability of the header in small font sizes.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        // Validate mark section header regex
        let markSectionHeaderRegex = this.defaultValue.markSectionHeaderRegex;
        const inputRegex = _input.markSectionHeaderRegex;
        if (typeof inputRegex === 'string') {
            try {
                new RegExp(inputRegex, 'd');
                markSectionHeaderRegex = inputRegex;
            }
            catch { }
        }
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            autohide: boolean(input.autohide, this.defaultValue.autohide),
            size: stringSet(input.size, this.defaultValue.size, [
                'proportional',
                'fill',
                'fit',
            ]),
            side: stringSet(input.side, this.defaultValue.side, ['right', 'left']),
            showSlider: stringSet(input.showSlider, this.defaultValue.showSlider, ['always', 'mouseover']),
            renderCharacters: boolean(input.renderCharacters, this.defaultValue.renderCharacters),
            scale: EditorIntOption.clampedInt(input.scale, 1, 1, 3),
            maxColumn: EditorIntOption.clampedInt(input.maxColumn, this.defaultValue.maxColumn, 1, 10000),
            showRegionSectionHeaders: boolean(input.showRegionSectionHeaders, this.defaultValue.showRegionSectionHeaders),
            showMarkSectionHeaders: boolean(input.showMarkSectionHeaders, this.defaultValue.showMarkSectionHeaders),
            markSectionHeaderRegex: markSectionHeaderRegex,
            sectionHeaderFontSize: EditorFloatOption.clamp(input.sectionHeaderFontSize ?? this.defaultValue.sectionHeaderFontSize, 4, 32),
            sectionHeaderLetterSpacing: EditorFloatOption.clamp(input.sectionHeaderLetterSpacing ?? this.defaultValue.sectionHeaderLetterSpacing, 0, 5),
        };
    }
}
//#endregion
//#region multiCursorModifier
function _multiCursorModifierFromString(multiCursorModifier) {
    if (multiCursorModifier === 'ctrlCmd') {
        return platform.isMacintosh ? 'metaKey' : 'ctrlKey';
    }
    return 'altKey';
}
class EditorPadding extends BaseEditorOption {
    constructor() {
        super(88 /* EditorOption.padding */, 'padding', { top: 0, bottom: 0 }, {
            'editor.padding.top': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.top', 'Controls the amount of space between the top edge of the editor and the first line.'),
            },
            'editor.padding.bottom': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.bottom', 'Controls the amount of space between the bottom edge of the editor and the last line.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            top: EditorIntOption.clampedInt(input.top, 0, 0, 1000),
            bottom: EditorIntOption.clampedInt(input.bottom, 0, 0, 1000),
        };
    }
}
class EditorParameterHints extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            cycle: true,
        };
        super(90 /* EditorOption.parameterHints */, 'parameterHints', defaults, {
            'editor.parameterHints.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('parameterHints.enabled', 'Enables a pop-up that shows parameter documentation and type information as you type.'),
            },
            'editor.parameterHints.cycle': {
                type: 'boolean',
                default: defaults.cycle,
                description: nls.localize('parameterHints.cycle', 'Controls whether the parameter hints menu cycles or closes when reaching the end of the list.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            cycle: boolean(input.cycle, this.defaultValue.cycle),
        };
    }
}
//#endregion
//#region pixelRatio
class EditorPixelRatio extends ComputedEditorOption {
    constructor() {
        super(149 /* EditorOption.pixelRatio */);
    }
    compute(env, options, _) {
        return env.pixelRatio;
    }
}
//#endregion
//#region
class PlaceholderOption extends BaseEditorOption {
    constructor() {
        super(92 /* EditorOption.placeholder */, 'placeholder', undefined);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            return input;
        }
        return this.defaultValue;
    }
}
class EditorQuickSuggestions extends BaseEditorOption {
    constructor() {
        const defaults = {
            other: 'on',
            comments: 'off',
            strings: 'on', // Void changed this setting
        };
        const types = [
            { type: 'boolean' },
            {
                type: 'string',
                enum: ['on', 'inline', 'off'],
                enumDescriptions: [
                    nls.localize('on', 'Quick suggestions show inside the suggest widget'),
                    nls.localize('inline', 'Quick suggestions show as ghost text'),
                    nls.localize('off', 'Quick suggestions are disabled'),
                ],
            },
        ];
        super(94 /* EditorOption.quickSuggestions */, 'quickSuggestions', defaults, {
            type: 'object',
            additionalProperties: false,
            properties: {
                strings: {
                    anyOf: types,
                    default: defaults.strings,
                    description: nls.localize('quickSuggestions.strings', 'Enable quick suggestions inside strings.'),
                },
                comments: {
                    anyOf: types,
                    default: defaults.comments,
                    description: nls.localize('quickSuggestions.comments', 'Enable quick suggestions inside comments.'),
                },
                other: {
                    anyOf: types,
                    default: defaults.other,
                    description: nls.localize('quickSuggestions.other', 'Enable quick suggestions outside of strings and comments.'),
                },
            },
            default: defaults,
            markdownDescription: nls.localize('quickSuggestions', 'Controls whether suggestions should automatically show up while typing. This can be controlled for typing in comments, strings, and other code. Quick suggestion can be configured to show as ghost text or with the suggest widget. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.', '`#editor.suggestOnTriggerCharacters#`'),
        });
        this.defaultValue = defaults;
    }
    validate(input) {
        if (typeof input === 'boolean') {
            // boolean -> all on/off
            const value = input ? 'on' : 'off';
            return { comments: value, strings: value, other: value };
        }
        if (!input || typeof input !== 'object') {
            // invalid object
            return this.defaultValue;
        }
        const { other, comments, strings } = input;
        const allowedValues = ['on', 'inline', 'off'];
        let validatedOther;
        let validatedComments;
        let validatedStrings;
        if (typeof other === 'boolean') {
            validatedOther = other ? 'on' : 'off';
        }
        else {
            validatedOther = stringSet(other, this.defaultValue.other, allowedValues);
        }
        if (typeof comments === 'boolean') {
            validatedComments = comments ? 'on' : 'off';
        }
        else {
            validatedComments = stringSet(comments, this.defaultValue.comments, allowedValues);
        }
        if (typeof strings === 'boolean') {
            validatedStrings = strings ? 'on' : 'off';
        }
        else {
            validatedStrings = stringSet(strings, this.defaultValue.strings, allowedValues);
        }
        return {
            other: validatedOther,
            comments: validatedComments,
            strings: validatedStrings,
        };
    }
}
export var RenderLineNumbersType;
(function (RenderLineNumbersType) {
    RenderLineNumbersType[RenderLineNumbersType["Off"] = 0] = "Off";
    RenderLineNumbersType[RenderLineNumbersType["On"] = 1] = "On";
    RenderLineNumbersType[RenderLineNumbersType["Relative"] = 2] = "Relative";
    RenderLineNumbersType[RenderLineNumbersType["Interval"] = 3] = "Interval";
    RenderLineNumbersType[RenderLineNumbersType["Custom"] = 4] = "Custom";
})(RenderLineNumbersType || (RenderLineNumbersType = {}));
class EditorRenderLineNumbersOption extends BaseEditorOption {
    constructor() {
        super(69 /* EditorOption.lineNumbers */, 'lineNumbers', { renderType: 1 /* RenderLineNumbersType.On */, renderFn: null }, {
            type: 'string',
            enum: ['off', 'on', 'relative', 'interval'],
            enumDescriptions: [
                nls.localize('lineNumbers.off', 'Line numbers are not rendered.'),
                nls.localize('lineNumbers.on', 'Line numbers are rendered as absolute number.'),
                nls.localize('lineNumbers.relative', 'Line numbers are rendered as distance in lines to cursor position.'),
                nls.localize('lineNumbers.interval', 'Line numbers are rendered every 10 lines.'),
            ],
            default: 'on',
            description: nls.localize('lineNumbers', 'Controls the display of line numbers.'),
        });
    }
    validate(lineNumbers) {
        let renderType = this.defaultValue.renderType;
        let renderFn = this.defaultValue.renderFn;
        if (typeof lineNumbers !== 'undefined') {
            if (typeof lineNumbers === 'function') {
                renderType = 4 /* RenderLineNumbersType.Custom */;
                renderFn = lineNumbers;
            }
            else if (lineNumbers === 'interval') {
                renderType = 3 /* RenderLineNumbersType.Interval */;
            }
            else if (lineNumbers === 'relative') {
                renderType = 2 /* RenderLineNumbersType.Relative */;
            }
            else if (lineNumbers === 'on') {
                renderType = 1 /* RenderLineNumbersType.On */;
            }
            else {
                renderType = 0 /* RenderLineNumbersType.Off */;
            }
        }
        return {
            renderType,
            renderFn,
        };
    }
}
//#endregion
//#region renderValidationDecorations
/**
 * @internal
 */
export function filterValidationDecorations(options) {
    const renderValidationDecorations = options.get(103 /* EditorOption.renderValidationDecorations */);
    if (renderValidationDecorations === 'editable') {
        return options.get(96 /* EditorOption.readOnly */);
    }
    return renderValidationDecorations === 'on' ? false : true;
}
class EditorRulers extends BaseEditorOption {
    constructor() {
        const defaults = [];
        const columnSchema = {
            type: 'number',
            description: nls.localize('rulers.size', 'Number of monospace characters at which this editor ruler will render.'),
        };
        super(107 /* EditorOption.rulers */, 'rulers', defaults, {
            type: 'array',
            items: {
                anyOf: [
                    columnSchema,
                    {
                        type: ['object'],
                        properties: {
                            column: columnSchema,
                            color: {
                                type: 'string',
                                description: nls.localize('rulers.color', 'Color of this editor ruler.'),
                                format: 'color-hex',
                            },
                        },
                    },
                ],
            },
            default: defaults,
            description: nls.localize('rulers', 'Render vertical rulers after a certain number of monospace characters. Use multiple values for multiple rulers. No rulers are drawn if array is empty.'),
        });
    }
    validate(input) {
        if (Array.isArray(input)) {
            const rulers = [];
            for (const _element of input) {
                if (typeof _element === 'number') {
                    rulers.push({
                        column: EditorIntOption.clampedInt(_element, 0, 0, 10000),
                        color: null,
                    });
                }
                else if (_element && typeof _element === 'object') {
                    const element = _element;
                    rulers.push({
                        column: EditorIntOption.clampedInt(element.column, 0, 0, 10000),
                        color: element.color,
                    });
                }
            }
            rulers.sort((a, b) => a.column - b.column);
            return rulers;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region readonly
/**
 * Configuration options for readonly message
 */
class ReadonlyMessage extends BaseEditorOption {
    constructor() {
        const defaults = undefined;
        super(97 /* EditorOption.readOnlyMessage */, 'readOnlyMessage', defaults);
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        return _input;
    }
}
function _scrollbarVisibilityFromString(visibility, defaultValue) {
    if (typeof visibility !== 'string') {
        return defaultValue;
    }
    switch (visibility) {
        case 'hidden':
            return 2 /* ScrollbarVisibility.Hidden */;
        case 'visible':
            return 3 /* ScrollbarVisibility.Visible */;
        default:
            return 1 /* ScrollbarVisibility.Auto */;
    }
}
class EditorScrollbar extends BaseEditorOption {
    constructor() {
        const defaults = {
            vertical: 1 /* ScrollbarVisibility.Auto */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            arrowSize: 11,
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            horizontalScrollbarSize: 12,
            horizontalSliderSize: 12,
            verticalScrollbarSize: 14,
            verticalSliderSize: 14,
            handleMouseWheel: true,
            alwaysConsumeMouseWheel: true,
            scrollByPage: false,
            ignoreHorizontalScrollbarInContentHeight: false,
        };
        super(108 /* EditorOption.scrollbar */, 'scrollbar', defaults, {
            'editor.scrollbar.vertical': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.vertical.auto', 'The vertical scrollbar will be visible only when necessary.'),
                    nls.localize('scrollbar.vertical.visible', 'The vertical scrollbar will always be visible.'),
                    nls.localize('scrollbar.vertical.fit', 'The vertical scrollbar will always be hidden.'),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.vertical', 'Controls the visibility of the vertical scrollbar.'),
            },
            'editor.scrollbar.horizontal': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.horizontal.auto', 'The horizontal scrollbar will be visible only when necessary.'),
                    nls.localize('scrollbar.horizontal.visible', 'The horizontal scrollbar will always be visible.'),
                    nls.localize('scrollbar.horizontal.fit', 'The horizontal scrollbar will always be hidden.'),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.horizontal', 'Controls the visibility of the horizontal scrollbar.'),
            },
            'editor.scrollbar.verticalScrollbarSize': {
                type: 'number',
                default: defaults.verticalScrollbarSize,
                description: nls.localize('scrollbar.verticalScrollbarSize', 'The width of the vertical scrollbar.'),
            },
            'editor.scrollbar.horizontalScrollbarSize': {
                type: 'number',
                default: defaults.horizontalScrollbarSize,
                description: nls.localize('scrollbar.horizontalScrollbarSize', 'The height of the horizontal scrollbar.'),
            },
            'editor.scrollbar.scrollByPage': {
                type: 'boolean',
                default: defaults.scrollByPage,
                description: nls.localize('scrollbar.scrollByPage', 'Controls whether clicks scroll by page or jump to click position.'),
            },
            'editor.scrollbar.ignoreHorizontalScrollbarInContentHeight': {
                type: 'boolean',
                default: defaults.ignoreHorizontalScrollbarInContentHeight,
                description: nls.localize('scrollbar.ignoreHorizontalScrollbarInContentHeight', "When set, the horizontal scrollbar will not increase the size of the editor's content."),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        const horizontalScrollbarSize = EditorIntOption.clampedInt(input.horizontalScrollbarSize, this.defaultValue.horizontalScrollbarSize, 0, 1000);
        const verticalScrollbarSize = EditorIntOption.clampedInt(input.verticalScrollbarSize, this.defaultValue.verticalScrollbarSize, 0, 1000);
        return {
            arrowSize: EditorIntOption.clampedInt(input.arrowSize, this.defaultValue.arrowSize, 0, 1000),
            vertical: _scrollbarVisibilityFromString(input.vertical, this.defaultValue.vertical),
            horizontal: _scrollbarVisibilityFromString(input.horizontal, this.defaultValue.horizontal),
            useShadows: boolean(input.useShadows, this.defaultValue.useShadows),
            verticalHasArrows: boolean(input.verticalHasArrows, this.defaultValue.verticalHasArrows),
            horizontalHasArrows: boolean(input.horizontalHasArrows, this.defaultValue.horizontalHasArrows),
            handleMouseWheel: boolean(input.handleMouseWheel, this.defaultValue.handleMouseWheel),
            alwaysConsumeMouseWheel: boolean(input.alwaysConsumeMouseWheel, this.defaultValue.alwaysConsumeMouseWheel),
            horizontalScrollbarSize: horizontalScrollbarSize,
            horizontalSliderSize: EditorIntOption.clampedInt(input.horizontalSliderSize, horizontalScrollbarSize, 0, 1000),
            verticalScrollbarSize: verticalScrollbarSize,
            verticalSliderSize: EditorIntOption.clampedInt(input.verticalSliderSize, verticalScrollbarSize, 0, 1000),
            scrollByPage: boolean(input.scrollByPage, this.defaultValue.scrollByPage),
            ignoreHorizontalScrollbarInContentHeight: boolean(input.ignoreHorizontalScrollbarInContentHeight, this.defaultValue.ignoreHorizontalScrollbarInContentHeight),
        };
    }
}
/**
 * @internal
 */
export const inUntrustedWorkspace = 'inUntrustedWorkspace';
/**
 * @internal
 */
export const unicodeHighlightConfigKeys = {
    allowedCharacters: 'editor.unicodeHighlight.allowedCharacters',
    invisibleCharacters: 'editor.unicodeHighlight.invisibleCharacters',
    nonBasicASCII: 'editor.unicodeHighlight.nonBasicASCII',
    ambiguousCharacters: 'editor.unicodeHighlight.ambiguousCharacters',
    includeComments: 'editor.unicodeHighlight.includeComments',
    includeStrings: 'editor.unicodeHighlight.includeStrings',
    allowedLocales: 'editor.unicodeHighlight.allowedLocales',
};
class UnicodeHighlight extends BaseEditorOption {
    constructor() {
        const defaults = {
            nonBasicASCII: inUntrustedWorkspace,
            invisibleCharacters: true,
            ambiguousCharacters: true,
            includeComments: inUntrustedWorkspace,
            includeStrings: true,
            allowedCharacters: {},
            allowedLocales: { _os: true, _vscode: true },
        };
        super(130 /* EditorOption.unicodeHighlighting */, 'unicodeHighlight', defaults, {
            [unicodeHighlightConfigKeys.nonBasicASCII]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.nonBasicASCII,
                description: nls.localize('unicodeHighlight.nonBasicASCII', 'Controls whether all non-basic ASCII characters are highlighted. Only characters between U+0020 and U+007E, tab, line-feed and carriage-return are considered basic ASCII.'),
            },
            [unicodeHighlightConfigKeys.invisibleCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.invisibleCharacters,
                description: nls.localize('unicodeHighlight.invisibleCharacters', 'Controls whether characters that just reserve space or have no width at all are highlighted.'),
            },
            [unicodeHighlightConfigKeys.ambiguousCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.ambiguousCharacters,
                description: nls.localize('unicodeHighlight.ambiguousCharacters', 'Controls whether characters are highlighted that can be confused with basic ASCII characters, except those that are common in the current user locale.'),
            },
            [unicodeHighlightConfigKeys.includeComments]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeComments,
                description: nls.localize('unicodeHighlight.includeComments', 'Controls whether characters in comments should also be subject to Unicode highlighting.'),
            },
            [unicodeHighlightConfigKeys.includeStrings]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeStrings,
                description: nls.localize('unicodeHighlight.includeStrings', 'Controls whether characters in strings should also be subject to Unicode highlighting.'),
            },
            [unicodeHighlightConfigKeys.allowedCharacters]: {
                restricted: true,
                type: 'object',
                default: defaults.allowedCharacters,
                description: nls.localize('unicodeHighlight.allowedCharacters', 'Defines allowed characters that are not being highlighted.'),
                additionalProperties: {
                    type: 'boolean',
                },
            },
            [unicodeHighlightConfigKeys.allowedLocales]: {
                restricted: true,
                type: 'object',
                additionalProperties: {
                    type: 'boolean',
                },
                default: defaults.allowedLocales,
                description: nls.localize('unicodeHighlight.allowedLocales', 'Unicode characters that are common in allowed locales are not being highlighted.'),
            },
        });
    }
    applyUpdate(value, update) {
        let didChange = false;
        if (update.allowedCharacters && value) {
            // Treat allowedCharacters atomically
            if (!objects.equals(value.allowedCharacters, update.allowedCharacters)) {
                value = { ...value, allowedCharacters: update.allowedCharacters };
                didChange = true;
            }
        }
        if (update.allowedLocales && value) {
            // Treat allowedLocales atomically
            if (!objects.equals(value.allowedLocales, update.allowedLocales)) {
                value = { ...value, allowedLocales: update.allowedLocales };
                didChange = true;
            }
        }
        const result = super.applyUpdate(value, update);
        if (didChange) {
            return new ApplyUpdateResult(result.newValue, true);
        }
        return result;
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            nonBasicASCII: primitiveSet(input.nonBasicASCII, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            invisibleCharacters: boolean(input.invisibleCharacters, this.defaultValue.invisibleCharacters),
            ambiguousCharacters: boolean(input.ambiguousCharacters, this.defaultValue.ambiguousCharacters),
            includeComments: primitiveSet(input.includeComments, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            includeStrings: primitiveSet(input.includeStrings, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            allowedCharacters: this.validateBooleanMap(_input.allowedCharacters, this.defaultValue.allowedCharacters),
            allowedLocales: this.validateBooleanMap(_input.allowedLocales, this.defaultValue.allowedLocales),
        };
    }
    validateBooleanMap(map, defaultValue) {
        if (typeof map !== 'object' || !map) {
            return defaultValue;
        }
        const result = {};
        for (const [key, value] of Object.entries(map)) {
            if (value === true) {
                result[key] = true;
            }
        }
        return result;
    }
}
/**
 * Configuration options for inline suggestions
 */
class InlineEditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            mode: 'subwordSmart',
            showToolbar: 'onHover',
            suppressSuggestions: false,
            keepOnBlur: false,
            fontFamily: 'default',
            syntaxHighlightingEnabled: true,
            edits: {
                enabled: true,
                showCollapsed: false,
                renderSideBySide: 'auto',
                allowCodeShifting: 'always',
                useMultiLineGhostText: true,
            },
        };
        super(64 /* EditorOption.inlineSuggest */, 'inlineSuggest', defaults, {
            'editor.inlineSuggest.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('inlineSuggest.enabled', 'Controls whether to automatically show inline suggestions in the editor.'),
            },
            'editor.inlineSuggest.showToolbar': {
                type: 'string',
                default: defaults.showToolbar,
                enum: ['always', 'onHover', 'never'],
                enumDescriptions: [
                    nls.localize('inlineSuggest.showToolbar.always', 'Show the inline suggestion toolbar whenever an inline suggestion is shown.'),
                    nls.localize('inlineSuggest.showToolbar.onHover', 'Show the inline suggestion toolbar when hovering over an inline suggestion.'),
                    nls.localize('inlineSuggest.showToolbar.never', 'Never show the inline suggestion toolbar.'),
                ],
                description: nls.localize('inlineSuggest.showToolbar', 'Controls when to show the inline suggestion toolbar.'),
            },
            'editor.inlineSuggest.syntaxHighlightingEnabled': {
                type: 'boolean',
                default: defaults.syntaxHighlightingEnabled,
                description: nls.localize('inlineSuggest.syntaxHighlightingEnabled', 'Controls whether to show syntax highlighting for inline suggestions in the editor.'),
            },
            'editor.inlineSuggest.suppressSuggestions': {
                type: 'boolean',
                default: defaults.suppressSuggestions,
                description: nls.localize('inlineSuggest.suppressSuggestions', 'Controls how inline suggestions interact with the suggest widget. If enabled, the suggest widget is not shown automatically when inline suggestions are available.'),
            },
            'editor.inlineSuggest.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                description: nls.localize('inlineSuggest.fontFamily', 'Controls the font family of the inline suggestions.'),
            },
            'editor.inlineSuggest.edits.allowCodeShifting': {
                type: 'string',
                default: defaults.edits.allowCodeShifting,
                description: nls.localize('inlineSuggest.edits.allowCodeShifting', 'Controls whether showing a suggestion will shift the code to make space for the suggestion inline.'),
                enum: ['always', 'horizontal', 'never'],
                tags: ['nextEditSuggestions'],
            },
            'editor.inlineSuggest.edits.renderSideBySide': {
                type: 'string',
                default: defaults.edits.renderSideBySide,
                description: nls.localize('inlineSuggest.edits.renderSideBySide', 'Controls whether larger suggestions can be shown side by side.'),
                enum: ['auto', 'never'],
                enumDescriptions: [
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.auto', 'Larger suggestions will show side by side if there is enough space, otherwise they will be shown below.'),
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.never', 'Larger suggestions are never shown side by side and will always be shown below.'),
                ],
                tags: ['nextEditSuggestions'],
            },
            'editor.inlineSuggest.edits.showCollapsed': {
                type: 'boolean',
                default: defaults.edits.showCollapsed,
                description: nls.localize('inlineSuggest.edits.showCollapsed', 'Controls whether the suggestion will show as collapsed until jumping to it.'),
                tags: ['nextEditSuggestions'],
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            mode: stringSet(input.mode, this.defaultValue.mode, ['prefix', 'subword', 'subwordSmart']),
            showToolbar: stringSet(input.showToolbar, this.defaultValue.showToolbar, [
                'always',
                'onHover',
                'never',
            ]),
            suppressSuggestions: boolean(input.suppressSuggestions, this.defaultValue.suppressSuggestions),
            keepOnBlur: boolean(input.keepOnBlur, this.defaultValue.keepOnBlur),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            syntaxHighlightingEnabled: boolean(input.syntaxHighlightingEnabled, this.defaultValue.syntaxHighlightingEnabled),
            edits: {
                enabled: boolean(input.edits?.enabled, this.defaultValue.edits.enabled),
                showCollapsed: boolean(input.edits?.showCollapsed, this.defaultValue.edits.showCollapsed),
                allowCodeShifting: stringSet(input.edits?.allowCodeShifting, this.defaultValue.edits.allowCodeShifting, ['always', 'horizontal', 'never']),
                renderSideBySide: stringSet(input.edits?.renderSideBySide, this.defaultValue.edits.renderSideBySide, ['never', 'auto']),
                useMultiLineGhostText: boolean(input.edits?.useMultiLineGhostText, this.defaultValue.edits.useMultiLineGhostText),
            },
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class BracketPairColorization extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.enabled,
            independentColorPoolPerBracketType: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.independentColorPoolPerBracketType,
        };
        super(15 /* EditorOption.bracketPairColorization */, 'bracketPairColorization', defaults, {
            'editor.bracketPairColorization.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('bracketPairColorization.enabled', 'Controls whether bracket pair colorization is enabled or not. Use {0} to override the bracket highlight colors.', '`#workbench.colorCustomizations#`'),
            },
            'editor.bracketPairColorization.independentColorPoolPerBracketType': {
                type: 'boolean',
                default: defaults.independentColorPoolPerBracketType,
                description: nls.localize('bracketPairColorization.independentColorPoolPerBracketType', 'Controls whether each bracket type has its own independent color pool.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            independentColorPoolPerBracketType: boolean(input.independentColorPoolPerBracketType, this.defaultValue.independentColorPoolPerBracketType),
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class GuideOptions extends BaseEditorOption {
    constructor() {
        const defaults = {
            bracketPairs: false,
            bracketPairsHorizontal: 'active',
            highlightActiveBracketPair: true,
            indentation: true,
            highlightActiveIndentation: true,
        };
        super(16 /* EditorOption.guides */, 'guides', defaults, {
            'editor.guides.bracketPairs': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairs.true', 'Enables bracket pair guides.'),
                    nls.localize('editor.guides.bracketPairs.active', 'Enables bracket pair guides only for the active bracket pair.'),
                    nls.localize('editor.guides.bracketPairs.false', 'Disables bracket pair guides.'),
                ],
                default: defaults.bracketPairs,
                description: nls.localize('editor.guides.bracketPairs', 'Controls whether bracket pair guides are enabled or not.'),
            },
            'editor.guides.bracketPairsHorizontal': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairsHorizontal.true', 'Enables horizontal guides as addition to vertical bracket pair guides.'),
                    nls.localize('editor.guides.bracketPairsHorizontal.active', 'Enables horizontal guides only for the active bracket pair.'),
                    nls.localize('editor.guides.bracketPairsHorizontal.false', 'Disables horizontal bracket pair guides.'),
                ],
                default: defaults.bracketPairsHorizontal,
                description: nls.localize('editor.guides.bracketPairsHorizontal', 'Controls whether horizontal bracket pair guides are enabled or not.'),
            },
            'editor.guides.highlightActiveBracketPair': {
                type: 'boolean',
                default: defaults.highlightActiveBracketPair,
                description: nls.localize('editor.guides.highlightActiveBracketPair', 'Controls whether the editor should highlight the active bracket pair.'),
            },
            'editor.guides.indentation': {
                type: 'boolean',
                default: defaults.indentation,
                description: nls.localize('editor.guides.indentation', 'Controls whether the editor should render indent guides.'),
            },
            'editor.guides.highlightActiveIndentation': {
                type: ['boolean', 'string'],
                enum: [true, 'always', false],
                enumDescriptions: [
                    nls.localize('editor.guides.highlightActiveIndentation.true', 'Highlights the active indent guide.'),
                    nls.localize('editor.guides.highlightActiveIndentation.always', 'Highlights the active indent guide even if bracket guides are highlighted.'),
                    nls.localize('editor.guides.highlightActiveIndentation.false', 'Do not highlight the active indent guide.'),
                ],
                default: defaults.highlightActiveIndentation,
                description: nls.localize('editor.guides.highlightActiveIndentation', 'Controls whether the editor should highlight the active indent guide.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            bracketPairs: primitiveSet(input.bracketPairs, this.defaultValue.bracketPairs, [
                true,
                false,
                'active',
            ]),
            bracketPairsHorizontal: primitiveSet(input.bracketPairsHorizontal, this.defaultValue.bracketPairsHorizontal, [true, false, 'active']),
            highlightActiveBracketPair: boolean(input.highlightActiveBracketPair, this.defaultValue.highlightActiveBracketPair),
            indentation: boolean(input.indentation, this.defaultValue.indentation),
            highlightActiveIndentation: primitiveSet(input.highlightActiveIndentation, this.defaultValue.highlightActiveIndentation, [true, false, 'always']),
        };
    }
}
function primitiveSet(value, defaultValue, allowedValues) {
    const idx = allowedValues.indexOf(value);
    if (idx === -1) {
        return defaultValue;
    }
    return allowedValues[idx];
}
class EditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: false,
            shareSuggestSelections: false,
            selectionMode: 'always',
            showIcons: true,
            showStatusBar: false,
            preview: false,
            previewMode: 'subwordSmart',
            showInlineDetails: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showDeprecated: true,
            matchOnWordStartOnly: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
            showUsers: true,
            showIssues: true,
        };
        super(123 /* EditorOption.suggest */, 'suggest', defaults, {
            'editor.suggest.insertMode': {
                type: 'string',
                enum: ['insert', 'replace'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.insert', 'Insert suggestion without overwriting text right of the cursor.'),
                    nls.localize('suggest.insertMode.replace', 'Insert suggestion and overwrite text right of the cursor.'),
                ],
                default: defaults.insertMode,
                description: nls.localize('suggest.insertMode', 'Controls whether words are overwritten when accepting completions. Note that this depends on extensions opting into this feature.'),
            },
            'editor.suggest.filterGraceful': {
                type: 'boolean',
                default: defaults.filterGraceful,
                description: nls.localize('suggest.filterGraceful', 'Controls whether filtering and sorting suggestions accounts for small typos.'),
            },
            'editor.suggest.localityBonus': {
                type: 'boolean',
                default: defaults.localityBonus,
                description: nls.localize('suggest.localityBonus', 'Controls whether sorting favors words that appear close to the cursor.'),
            },
            'editor.suggest.shareSuggestSelections': {
                type: 'boolean',
                default: defaults.shareSuggestSelections,
                markdownDescription: nls.localize('suggest.shareSuggestSelections', 'Controls whether remembered suggestion selections are shared between multiple workspaces and windows (needs `#editor.suggestSelection#`).'),
            },
            'editor.suggest.selectionMode': {
                type: 'string',
                enum: ['always', 'never', 'whenTriggerCharacter', 'whenQuickSuggestion'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.always', 'Always select a suggestion when automatically triggering IntelliSense.'),
                    nls.localize('suggest.insertMode.never', 'Never select a suggestion when automatically triggering IntelliSense.'),
                    nls.localize('suggest.insertMode.whenTriggerCharacter', 'Select a suggestion only when triggering IntelliSense from a trigger character.'),
                    nls.localize('suggest.insertMode.whenQuickSuggestion', 'Select a suggestion only when triggering IntelliSense as you type.'),
                ],
                default: defaults.selectionMode,
                markdownDescription: nls.localize('suggest.selectionMode', 'Controls whether a suggestion is selected when the widget shows. Note that this only applies to automatically triggered suggestions ({0} and {1}) and that a suggestion is always selected when explicitly invoked, e.g via `Ctrl+Space`.', '`#editor.quickSuggestions#`', '`#editor.suggestOnTriggerCharacters#`'),
            },
            'editor.suggest.snippetsPreventQuickSuggestions': {
                type: 'boolean',
                default: defaults.snippetsPreventQuickSuggestions,
                description: nls.localize('suggest.snippetsPreventQuickSuggestions', 'Controls whether an active snippet prevents quick suggestions.'),
            },
            'editor.suggest.showIcons': {
                type: 'boolean',
                default: defaults.showIcons,
                description: nls.localize('suggest.showIcons', 'Controls whether to show or hide icons in suggestions.'),
            },
            'editor.suggest.showStatusBar': {
                type: 'boolean',
                default: defaults.showStatusBar,
                description: nls.localize('suggest.showStatusBar', 'Controls the visibility of the status bar at the bottom of the suggest widget.'),
            },
            'editor.suggest.preview': {
                type: 'boolean',
                default: defaults.preview,
                description: nls.localize('suggest.preview', 'Controls whether to preview the suggestion outcome in the editor.'),
            },
            'editor.suggest.showInlineDetails': {
                type: 'boolean',
                default: defaults.showInlineDetails,
                description: nls.localize('suggest.showInlineDetails', 'Controls whether suggest details show inline with the label or only in the details widget.'),
            },
            'editor.suggest.maxVisibleSuggestions': {
                type: 'number',
                deprecationMessage: nls.localize('suggest.maxVisibleSuggestions.dep', 'This setting is deprecated. The suggest widget can now be resized.'),
            },
            'editor.suggest.filteredTypes': {
                type: 'object',
                deprecationMessage: nls.localize('deprecated', "This setting is deprecated, please use separate settings like 'editor.suggest.showKeywords' or 'editor.suggest.showSnippets' instead."),
            },
            'editor.suggest.showMethods': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showMethods', 'When enabled IntelliSense shows `method`-suggestions.'),
            },
            'editor.suggest.showFunctions': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFunctions', 'When enabled IntelliSense shows `function`-suggestions.'),
            },
            'editor.suggest.showConstructors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstructors', 'When enabled IntelliSense shows `constructor`-suggestions.'),
            },
            'editor.suggest.showDeprecated': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showDeprecated', 'When enabled IntelliSense shows `deprecated`-suggestions.'),
            },
            'editor.suggest.matchOnWordStartOnly': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.matchOnWordStartOnly', 'When enabled IntelliSense filtering requires that the first character matches on a word start. For example, `c` on `Console` or `WebContext` but _not_ on `description`. When disabled IntelliSense will show more results but still sorts them by match quality.'),
            },
            'editor.suggest.showFields': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFields', 'When enabled IntelliSense shows `field`-suggestions.'),
            },
            'editor.suggest.showVariables': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showVariables', 'When enabled IntelliSense shows `variable`-suggestions.'),
            },
            'editor.suggest.showClasses': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showClasss', 'When enabled IntelliSense shows `class`-suggestions.'),
            },
            'editor.suggest.showStructs': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showStructs', 'When enabled IntelliSense shows `struct`-suggestions.'),
            },
            'editor.suggest.showInterfaces': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showInterfaces', 'When enabled IntelliSense shows `interface`-suggestions.'),
            },
            'editor.suggest.showModules': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showModules', 'When enabled IntelliSense shows `module`-suggestions.'),
            },
            'editor.suggest.showProperties': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showPropertys', 'When enabled IntelliSense shows `property`-suggestions.'),
            },
            'editor.suggest.showEvents': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEvents', 'When enabled IntelliSense shows `event`-suggestions.'),
            },
            'editor.suggest.showOperators': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showOperators', 'When enabled IntelliSense shows `operator`-suggestions.'),
            },
            'editor.suggest.showUnits': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUnits', 'When enabled IntelliSense shows `unit`-suggestions.'),
            },
            'editor.suggest.showValues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showValues', 'When enabled IntelliSense shows `value`-suggestions.'),
            },
            'editor.suggest.showConstants': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstants', 'When enabled IntelliSense shows `constant`-suggestions.'),
            },
            'editor.suggest.showEnums': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnums', 'When enabled IntelliSense shows `enum`-suggestions.'),
            },
            'editor.suggest.showEnumMembers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnumMembers', 'When enabled IntelliSense shows `enumMember`-suggestions.'),
            },
            'editor.suggest.showKeywords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showKeywords', 'When enabled IntelliSense shows `keyword`-suggestions.'),
            },
            'editor.suggest.showWords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTexts', 'When enabled IntelliSense shows `text`-suggestions.'),
            },
            'editor.suggest.showColors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showColors', 'When enabled IntelliSense shows `color`-suggestions.'),
            },
            'editor.suggest.showFiles': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFiles', 'When enabled IntelliSense shows `file`-suggestions.'),
            },
            'editor.suggest.showReferences': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showReferences', 'When enabled IntelliSense shows `reference`-suggestions.'),
            },
            'editor.suggest.showCustomcolors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showCustomcolors', 'When enabled IntelliSense shows `customcolor`-suggestions.'),
            },
            'editor.suggest.showFolders': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFolders', 'When enabled IntelliSense shows `folder`-suggestions.'),
            },
            'editor.suggest.showTypeParameters': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTypeParameters', 'When enabled IntelliSense shows `typeParameter`-suggestions.'),
            },
            'editor.suggest.showSnippets': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showSnippets', 'When enabled IntelliSense shows `snippet`-suggestions.'),
            },
            'editor.suggest.showUsers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUsers', 'When enabled IntelliSense shows `user`-suggestions.'),
            },
            'editor.suggest.showIssues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showIssues', 'When enabled IntelliSense shows `issues`-suggestions.'),
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertMode: stringSet(input.insertMode, this.defaultValue.insertMode, ['insert', 'replace']),
            filterGraceful: boolean(input.filterGraceful, this.defaultValue.filterGraceful),
            snippetsPreventQuickSuggestions: boolean(input.snippetsPreventQuickSuggestions, this.defaultValue.filterGraceful),
            localityBonus: boolean(input.localityBonus, this.defaultValue.localityBonus),
            shareSuggestSelections: boolean(input.shareSuggestSelections, this.defaultValue.shareSuggestSelections),
            selectionMode: stringSet(input.selectionMode, this.defaultValue.selectionMode, [
                'always',
                'never',
                'whenQuickSuggestion',
                'whenTriggerCharacter',
            ]),
            showIcons: boolean(input.showIcons, this.defaultValue.showIcons),
            showStatusBar: boolean(input.showStatusBar, this.defaultValue.showStatusBar),
            preview: boolean(input.preview, this.defaultValue.preview),
            previewMode: stringSet(input.previewMode, this.defaultValue.previewMode, [
                'prefix',
                'subword',
                'subwordSmart',
            ]),
            showInlineDetails: boolean(input.showInlineDetails, this.defaultValue.showInlineDetails),
            showMethods: boolean(input.showMethods, this.defaultValue.showMethods),
            showFunctions: boolean(input.showFunctions, this.defaultValue.showFunctions),
            showConstructors: boolean(input.showConstructors, this.defaultValue.showConstructors),
            showDeprecated: boolean(input.showDeprecated, this.defaultValue.showDeprecated),
            matchOnWordStartOnly: boolean(input.matchOnWordStartOnly, this.defaultValue.matchOnWordStartOnly),
            showFields: boolean(input.showFields, this.defaultValue.showFields),
            showVariables: boolean(input.showVariables, this.defaultValue.showVariables),
            showClasses: boolean(input.showClasses, this.defaultValue.showClasses),
            showStructs: boolean(input.showStructs, this.defaultValue.showStructs),
            showInterfaces: boolean(input.showInterfaces, this.defaultValue.showInterfaces),
            showModules: boolean(input.showModules, this.defaultValue.showModules),
            showProperties: boolean(input.showProperties, this.defaultValue.showProperties),
            showEvents: boolean(input.showEvents, this.defaultValue.showEvents),
            showOperators: boolean(input.showOperators, this.defaultValue.showOperators),
            showUnits: boolean(input.showUnits, this.defaultValue.showUnits),
            showValues: boolean(input.showValues, this.defaultValue.showValues),
            showConstants: boolean(input.showConstants, this.defaultValue.showConstants),
            showEnums: boolean(input.showEnums, this.defaultValue.showEnums),
            showEnumMembers: boolean(input.showEnumMembers, this.defaultValue.showEnumMembers),
            showKeywords: boolean(input.showKeywords, this.defaultValue.showKeywords),
            showWords: boolean(input.showWords, this.defaultValue.showWords),
            showColors: boolean(input.showColors, this.defaultValue.showColors),
            showFiles: boolean(input.showFiles, this.defaultValue.showFiles),
            showReferences: boolean(input.showReferences, this.defaultValue.showReferences),
            showFolders: boolean(input.showFolders, this.defaultValue.showFolders),
            showTypeParameters: boolean(input.showTypeParameters, this.defaultValue.showTypeParameters),
            showSnippets: boolean(input.showSnippets, this.defaultValue.showSnippets),
            showUsers: boolean(input.showUsers, this.defaultValue.showUsers),
            showIssues: boolean(input.showIssues, this.defaultValue.showIssues),
        };
    }
}
class SmartSelect extends BaseEditorOption {
    constructor() {
        super(118 /* EditorOption.smartSelect */, 'smartSelect', {
            selectLeadingAndTrailingWhitespace: true,
            selectSubwords: true,
        }, {
            'editor.smartSelect.selectLeadingAndTrailingWhitespace': {
                description: nls.localize('selectLeadingAndTrailingWhitespace', 'Whether leading and trailing whitespace should always be selected.'),
                default: true,
                type: 'boolean',
            },
            'editor.smartSelect.selectSubwords': {
                description: nls.localize('selectSubwords', "Whether subwords (like 'foo' in 'fooBar' or 'foo_bar') should be selected."),
                default: true,
                type: 'boolean',
            },
        });
    }
    validate(input) {
        if (!input || typeof input !== 'object') {
            return this.defaultValue;
        }
        return {
            selectLeadingAndTrailingWhitespace: boolean(input.selectLeadingAndTrailingWhitespace, this.defaultValue.selectLeadingAndTrailingWhitespace),
            selectSubwords: boolean(input.selectSubwords, this.defaultValue.selectSubwords),
        };
    }
}
//#endregion
//#region wordSegmenterLocales
/**
 * Locales used for segmenting lines into words when doing word related navigations or operations.
 *
 * Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).
 */
class WordSegmenterLocales extends BaseEditorOption {
    constructor() {
        const defaults = [];
        super(135 /* EditorOption.wordSegmenterLocales */, 'wordSegmenterLocales', defaults, {
            anyOf: [
                {
                    description: nls.localize('wordSegmenterLocales', 'Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).'),
                    type: 'string',
                },
                {
                    description: nls.localize('wordSegmenterLocales', 'Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).'),
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
            ],
        });
    }
    validate(input) {
        if (typeof input === 'string') {
            input = [input];
        }
        if (Array.isArray(input)) {
            const validLocales = [];
            for (const locale of input) {
                if (typeof locale === 'string') {
                    try {
                        if (Intl.Segmenter.supportedLocalesOf(locale).length > 0) {
                            validLocales.push(locale);
                        }
                    }
                    catch {
                        // ignore invalid locales
                    }
                }
            }
            return validLocales;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region wrappingIndent
/**
 * Describes how to indent wrapped lines.
 */
export var WrappingIndent;
(function (WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[WrappingIndent["None"] = 0] = "None";
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[WrappingIndent["Same"] = 1] = "Same";
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["Indent"] = 2] = "Indent";
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["DeepIndent"] = 3] = "DeepIndent";
})(WrappingIndent || (WrappingIndent = {}));
class WrappingIndentOption extends BaseEditorOption {
    constructor() {
        super(143 /* EditorOption.wrappingIndent */, 'wrappingIndent', 1 /* WrappingIndent.Same */, {
            'editor.wrappingIndent': {
                type: 'string',
                enum: ['none', 'same', 'indent', 'deepIndent'],
                enumDescriptions: [
                    nls.localize('wrappingIndent.none', 'No indentation. Wrapped lines begin at column 1.'),
                    nls.localize('wrappingIndent.same', 'Wrapped lines get the same indentation as the parent.'),
                    nls.localize('wrappingIndent.indent', 'Wrapped lines get +1 indentation toward the parent.'),
                    nls.localize('wrappingIndent.deepIndent', 'Wrapped lines get +2 indentation toward the parent.'),
                ],
                description: nls.localize('wrappingIndent', 'Controls the indentation of wrapped lines.'),
                default: 'same',
            },
        });
    }
    validate(input) {
        switch (input) {
            case 'none':
                return 0 /* WrappingIndent.None */;
            case 'same':
                return 1 /* WrappingIndent.Same */;
            case 'indent':
                return 2 /* WrappingIndent.Indent */;
            case 'deepIndent':
                return 3 /* WrappingIndent.DeepIndent */;
        }
        return 1 /* WrappingIndent.Same */;
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we use no indent wrapping to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 0 /* WrappingIndent.None */;
        }
        return value;
    }
}
class EditorWrappingInfoComputer extends ComputedEditorOption {
    constructor() {
        super(152 /* EditorOption.wrappingInfo */);
    }
    compute(env, options, _) {
        const layoutInfo = options.get(151 /* EditorOption.layoutInfo */);
        return {
            isDominatedByLongLines: env.isDominatedByLongLines,
            isWordWrapMinified: layoutInfo.isWordWrapMinified,
            isViewportWrapping: layoutInfo.isViewportWrapping,
            wrappingColumn: layoutInfo.wrappingColumn,
        };
    }
}
class EditorDropIntoEditor extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showDropSelector: 'afterDrop' };
        super(36 /* EditorOption.dropIntoEditor */, 'dropIntoEditor', defaults, {
            'editor.dropIntoEditor.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('dropIntoEditor.enabled', 'Controls whether you can drag and drop a file into a text editor by holding down the `Shift` key (instead of opening the file in an editor).'),
            },
            'editor.dropIntoEditor.showDropSelector': {
                type: 'string',
                markdownDescription: nls.localize('dropIntoEditor.showDropSelector', 'Controls if a widget is shown when dropping files into the editor. This widget lets you control how the file is dropped.'),
                enum: ['afterDrop', 'never'],
                enumDescriptions: [
                    nls.localize('dropIntoEditor.showDropSelector.afterDrop', 'Show the drop selector widget after a file is dropped into the editor.'),
                    nls.localize('dropIntoEditor.showDropSelector.never', 'Never show the drop selector widget. Instead the default drop provider is always used.'),
                ],
                default: 'afterDrop',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showDropSelector: stringSet(input.showDropSelector, this.defaultValue.showDropSelector, [
                'afterDrop',
                'never',
            ]),
        };
    }
}
class EditorPasteAs extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showPasteSelector: 'afterPaste' };
        super(89 /* EditorOption.pasteAs */, 'pasteAs', defaults, {
            'editor.pasteAs.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('pasteAs.enabled', 'Controls whether you can paste content in different ways.'),
            },
            'editor.pasteAs.showPasteSelector': {
                type: 'string',
                markdownDescription: nls.localize('pasteAs.showPasteSelector', 'Controls if a widget is shown when pasting content in to the editor. This widget lets you control how the file is pasted.'),
                enum: ['afterPaste', 'never'],
                enumDescriptions: [
                    nls.localize('pasteAs.showPasteSelector.afterPaste', 'Show the paste selector widget after content is pasted into the editor.'),
                    nls.localize('pasteAs.showPasteSelector.never', 'Never show the paste selector widget. Instead the default pasting behavior is always used.'),
                ],
                default: 'afterPaste',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showPasteSelector: stringSet(input.showPasteSelector, this.defaultValue.showPasteSelector, [
                'afterPaste',
                'never',
            ]),
        };
    }
}
//#endregion
const DEFAULT_WINDOWS_FONT_FAMILY = "Consolas, 'Courier New', monospace";
const DEFAULT_MAC_FONT_FAMILY = "Menlo, Monaco, 'Courier New', monospace";
const DEFAULT_LINUX_FONT_FAMILY = "'Droid Sans Mono', 'monospace', monospace";
/**
 * @internal
 */
export const EDITOR_FONT_DEFAULTS = {
    fontFamily: platform.isMacintosh
        ? DEFAULT_MAC_FONT_FAMILY
        : platform.isLinux
            ? DEFAULT_LINUX_FONT_FAMILY
            : DEFAULT_WINDOWS_FONT_FAMILY,
    fontWeight: 'normal',
    fontSize: platform.isMacintosh ? 12 : 14,
    lineHeight: 0,
    letterSpacing: 0,
};
/**
 * @internal
 */
export const editorOptionsRegistry = [];
function register(option) {
    editorOptionsRegistry[option.id] = option;
    return option;
}
export var EditorOption;
(function (EditorOption) {
    EditorOption[EditorOption["acceptSuggestionOnCommitCharacter"] = 0] = "acceptSuggestionOnCommitCharacter";
    EditorOption[EditorOption["acceptSuggestionOnEnter"] = 1] = "acceptSuggestionOnEnter";
    EditorOption[EditorOption["accessibilitySupport"] = 2] = "accessibilitySupport";
    EditorOption[EditorOption["accessibilityPageSize"] = 3] = "accessibilityPageSize";
    EditorOption[EditorOption["ariaLabel"] = 4] = "ariaLabel";
    EditorOption[EditorOption["ariaRequired"] = 5] = "ariaRequired";
    EditorOption[EditorOption["autoClosingBrackets"] = 6] = "autoClosingBrackets";
    EditorOption[EditorOption["autoClosingComments"] = 7] = "autoClosingComments";
    EditorOption[EditorOption["screenReaderAnnounceInlineSuggestion"] = 8] = "screenReaderAnnounceInlineSuggestion";
    EditorOption[EditorOption["autoClosingDelete"] = 9] = "autoClosingDelete";
    EditorOption[EditorOption["autoClosingOvertype"] = 10] = "autoClosingOvertype";
    EditorOption[EditorOption["autoClosingQuotes"] = 11] = "autoClosingQuotes";
    EditorOption[EditorOption["autoIndent"] = 12] = "autoIndent";
    EditorOption[EditorOption["automaticLayout"] = 13] = "automaticLayout";
    EditorOption[EditorOption["autoSurround"] = 14] = "autoSurround";
    EditorOption[EditorOption["bracketPairColorization"] = 15] = "bracketPairColorization";
    EditorOption[EditorOption["guides"] = 16] = "guides";
    EditorOption[EditorOption["codeLens"] = 17] = "codeLens";
    EditorOption[EditorOption["codeLensFontFamily"] = 18] = "codeLensFontFamily";
    EditorOption[EditorOption["codeLensFontSize"] = 19] = "codeLensFontSize";
    EditorOption[EditorOption["colorDecorators"] = 20] = "colorDecorators";
    EditorOption[EditorOption["colorDecoratorsLimit"] = 21] = "colorDecoratorsLimit";
    EditorOption[EditorOption["columnSelection"] = 22] = "columnSelection";
    EditorOption[EditorOption["comments"] = 23] = "comments";
    EditorOption[EditorOption["contextmenu"] = 24] = "contextmenu";
    EditorOption[EditorOption["copyWithSyntaxHighlighting"] = 25] = "copyWithSyntaxHighlighting";
    EditorOption[EditorOption["cursorBlinking"] = 26] = "cursorBlinking";
    EditorOption[EditorOption["cursorSmoothCaretAnimation"] = 27] = "cursorSmoothCaretAnimation";
    EditorOption[EditorOption["cursorStyle"] = 28] = "cursorStyle";
    EditorOption[EditorOption["cursorSurroundingLines"] = 29] = "cursorSurroundingLines";
    EditorOption[EditorOption["cursorSurroundingLinesStyle"] = 30] = "cursorSurroundingLinesStyle";
    EditorOption[EditorOption["cursorWidth"] = 31] = "cursorWidth";
    EditorOption[EditorOption["disableLayerHinting"] = 32] = "disableLayerHinting";
    EditorOption[EditorOption["disableMonospaceOptimizations"] = 33] = "disableMonospaceOptimizations";
    EditorOption[EditorOption["domReadOnly"] = 34] = "domReadOnly";
    EditorOption[EditorOption["dragAndDrop"] = 35] = "dragAndDrop";
    EditorOption[EditorOption["dropIntoEditor"] = 36] = "dropIntoEditor";
    EditorOption[EditorOption["experimentalEditContextEnabled"] = 37] = "experimentalEditContextEnabled";
    EditorOption[EditorOption["emptySelectionClipboard"] = 38] = "emptySelectionClipboard";
    EditorOption[EditorOption["experimentalGpuAcceleration"] = 39] = "experimentalGpuAcceleration";
    EditorOption[EditorOption["experimentalWhitespaceRendering"] = 40] = "experimentalWhitespaceRendering";
    EditorOption[EditorOption["extraEditorClassName"] = 41] = "extraEditorClassName";
    EditorOption[EditorOption["fastScrollSensitivity"] = 42] = "fastScrollSensitivity";
    EditorOption[EditorOption["find"] = 43] = "find";
    EditorOption[EditorOption["fixedOverflowWidgets"] = 44] = "fixedOverflowWidgets";
    EditorOption[EditorOption["folding"] = 45] = "folding";
    EditorOption[EditorOption["foldingStrategy"] = 46] = "foldingStrategy";
    EditorOption[EditorOption["foldingHighlight"] = 47] = "foldingHighlight";
    EditorOption[EditorOption["foldingImportsByDefault"] = 48] = "foldingImportsByDefault";
    EditorOption[EditorOption["foldingMaximumRegions"] = 49] = "foldingMaximumRegions";
    EditorOption[EditorOption["unfoldOnClickAfterEndOfLine"] = 50] = "unfoldOnClickAfterEndOfLine";
    EditorOption[EditorOption["fontFamily"] = 51] = "fontFamily";
    EditorOption[EditorOption["fontInfo"] = 52] = "fontInfo";
    EditorOption[EditorOption["fontLigatures"] = 53] = "fontLigatures";
    EditorOption[EditorOption["fontSize"] = 54] = "fontSize";
    EditorOption[EditorOption["fontWeight"] = 55] = "fontWeight";
    EditorOption[EditorOption["fontVariations"] = 56] = "fontVariations";
    EditorOption[EditorOption["formatOnPaste"] = 57] = "formatOnPaste";
    EditorOption[EditorOption["formatOnType"] = 58] = "formatOnType";
    EditorOption[EditorOption["glyphMargin"] = 59] = "glyphMargin";
    EditorOption[EditorOption["gotoLocation"] = 60] = "gotoLocation";
    EditorOption[EditorOption["hideCursorInOverviewRuler"] = 61] = "hideCursorInOverviewRuler";
    EditorOption[EditorOption["hover"] = 62] = "hover";
    EditorOption[EditorOption["inDiffEditor"] = 63] = "inDiffEditor";
    EditorOption[EditorOption["inlineSuggest"] = 64] = "inlineSuggest";
    EditorOption[EditorOption["letterSpacing"] = 65] = "letterSpacing";
    EditorOption[EditorOption["lightbulb"] = 66] = "lightbulb";
    EditorOption[EditorOption["lineDecorationsWidth"] = 67] = "lineDecorationsWidth";
    EditorOption[EditorOption["lineHeight"] = 68] = "lineHeight";
    EditorOption[EditorOption["lineNumbers"] = 69] = "lineNumbers";
    EditorOption[EditorOption["lineNumbersMinChars"] = 70] = "lineNumbersMinChars";
    EditorOption[EditorOption["linkedEditing"] = 71] = "linkedEditing";
    EditorOption[EditorOption["links"] = 72] = "links";
    EditorOption[EditorOption["matchBrackets"] = 73] = "matchBrackets";
    EditorOption[EditorOption["minimap"] = 74] = "minimap";
    EditorOption[EditorOption["mouseStyle"] = 75] = "mouseStyle";
    EditorOption[EditorOption["mouseWheelScrollSensitivity"] = 76] = "mouseWheelScrollSensitivity";
    EditorOption[EditorOption["mouseWheelZoom"] = 77] = "mouseWheelZoom";
    EditorOption[EditorOption["multiCursorMergeOverlapping"] = 78] = "multiCursorMergeOverlapping";
    EditorOption[EditorOption["multiCursorModifier"] = 79] = "multiCursorModifier";
    EditorOption[EditorOption["multiCursorPaste"] = 80] = "multiCursorPaste";
    EditorOption[EditorOption["multiCursorLimit"] = 81] = "multiCursorLimit";
    EditorOption[EditorOption["occurrencesHighlight"] = 82] = "occurrencesHighlight";
    EditorOption[EditorOption["occurrencesHighlightDelay"] = 83] = "occurrencesHighlightDelay";
    EditorOption[EditorOption["overtypeCursorStyle"] = 84] = "overtypeCursorStyle";
    EditorOption[EditorOption["overtypeOnPaste"] = 85] = "overtypeOnPaste";
    EditorOption[EditorOption["overviewRulerBorder"] = 86] = "overviewRulerBorder";
    EditorOption[EditorOption["overviewRulerLanes"] = 87] = "overviewRulerLanes";
    EditorOption[EditorOption["padding"] = 88] = "padding";
    EditorOption[EditorOption["pasteAs"] = 89] = "pasteAs";
    EditorOption[EditorOption["parameterHints"] = 90] = "parameterHints";
    EditorOption[EditorOption["peekWidgetDefaultFocus"] = 91] = "peekWidgetDefaultFocus";
    EditorOption[EditorOption["placeholder"] = 92] = "placeholder";
    EditorOption[EditorOption["definitionLinkOpensInPeek"] = 93] = "definitionLinkOpensInPeek";
    EditorOption[EditorOption["quickSuggestions"] = 94] = "quickSuggestions";
    EditorOption[EditorOption["quickSuggestionsDelay"] = 95] = "quickSuggestionsDelay";
    EditorOption[EditorOption["readOnly"] = 96] = "readOnly";
    EditorOption[EditorOption["readOnlyMessage"] = 97] = "readOnlyMessage";
    EditorOption[EditorOption["renameOnType"] = 98] = "renameOnType";
    EditorOption[EditorOption["renderControlCharacters"] = 99] = "renderControlCharacters";
    EditorOption[EditorOption["renderFinalNewline"] = 100] = "renderFinalNewline";
    EditorOption[EditorOption["renderLineHighlight"] = 101] = "renderLineHighlight";
    EditorOption[EditorOption["renderLineHighlightOnlyWhenFocus"] = 102] = "renderLineHighlightOnlyWhenFocus";
    EditorOption[EditorOption["renderValidationDecorations"] = 103] = "renderValidationDecorations";
    EditorOption[EditorOption["renderWhitespace"] = 104] = "renderWhitespace";
    EditorOption[EditorOption["revealHorizontalRightPadding"] = 105] = "revealHorizontalRightPadding";
    EditorOption[EditorOption["roundedSelection"] = 106] = "roundedSelection";
    EditorOption[EditorOption["rulers"] = 107] = "rulers";
    EditorOption[EditorOption["scrollbar"] = 108] = "scrollbar";
    EditorOption[EditorOption["scrollBeyondLastColumn"] = 109] = "scrollBeyondLastColumn";
    EditorOption[EditorOption["scrollBeyondLastLine"] = 110] = "scrollBeyondLastLine";
    EditorOption[EditorOption["scrollPredominantAxis"] = 111] = "scrollPredominantAxis";
    EditorOption[EditorOption["selectionClipboard"] = 112] = "selectionClipboard";
    EditorOption[EditorOption["selectionHighlight"] = 113] = "selectionHighlight";
    EditorOption[EditorOption["selectOnLineNumbers"] = 114] = "selectOnLineNumbers";
    EditorOption[EditorOption["showFoldingControls"] = 115] = "showFoldingControls";
    EditorOption[EditorOption["showUnused"] = 116] = "showUnused";
    EditorOption[EditorOption["snippetSuggestions"] = 117] = "snippetSuggestions";
    EditorOption[EditorOption["smartSelect"] = 118] = "smartSelect";
    EditorOption[EditorOption["smoothScrolling"] = 119] = "smoothScrolling";
    EditorOption[EditorOption["stickyScroll"] = 120] = "stickyScroll";
    EditorOption[EditorOption["stickyTabStops"] = 121] = "stickyTabStops";
    EditorOption[EditorOption["stopRenderingLineAfter"] = 122] = "stopRenderingLineAfter";
    EditorOption[EditorOption["suggest"] = 123] = "suggest";
    EditorOption[EditorOption["suggestFontSize"] = 124] = "suggestFontSize";
    EditorOption[EditorOption["suggestLineHeight"] = 125] = "suggestLineHeight";
    EditorOption[EditorOption["suggestOnTriggerCharacters"] = 126] = "suggestOnTriggerCharacters";
    EditorOption[EditorOption["suggestSelection"] = 127] = "suggestSelection";
    EditorOption[EditorOption["tabCompletion"] = 128] = "tabCompletion";
    EditorOption[EditorOption["tabIndex"] = 129] = "tabIndex";
    EditorOption[EditorOption["unicodeHighlighting"] = 130] = "unicodeHighlighting";
    EditorOption[EditorOption["unusualLineTerminators"] = 131] = "unusualLineTerminators";
    EditorOption[EditorOption["useShadowDOM"] = 132] = "useShadowDOM";
    EditorOption[EditorOption["useTabStops"] = 133] = "useTabStops";
    EditorOption[EditorOption["wordBreak"] = 134] = "wordBreak";
    EditorOption[EditorOption["wordSegmenterLocales"] = 135] = "wordSegmenterLocales";
    EditorOption[EditorOption["wordSeparators"] = 136] = "wordSeparators";
    EditorOption[EditorOption["wordWrap"] = 137] = "wordWrap";
    EditorOption[EditorOption["wordWrapBreakAfterCharacters"] = 138] = "wordWrapBreakAfterCharacters";
    EditorOption[EditorOption["wordWrapBreakBeforeCharacters"] = 139] = "wordWrapBreakBeforeCharacters";
    EditorOption[EditorOption["wordWrapColumn"] = 140] = "wordWrapColumn";
    EditorOption[EditorOption["wordWrapOverride1"] = 141] = "wordWrapOverride1";
    EditorOption[EditorOption["wordWrapOverride2"] = 142] = "wordWrapOverride2";
    EditorOption[EditorOption["wrappingIndent"] = 143] = "wrappingIndent";
    EditorOption[EditorOption["wrappingStrategy"] = 144] = "wrappingStrategy";
    EditorOption[EditorOption["showDeprecated"] = 145] = "showDeprecated";
    EditorOption[EditorOption["inlayHints"] = 146] = "inlayHints";
    // Leave these at the end (because they have dependencies!)
    EditorOption[EditorOption["effectiveCursorStyle"] = 147] = "effectiveCursorStyle";
    EditorOption[EditorOption["editorClassName"] = 148] = "editorClassName";
    EditorOption[EditorOption["pixelRatio"] = 149] = "pixelRatio";
    EditorOption[EditorOption["tabFocusMode"] = 150] = "tabFocusMode";
    EditorOption[EditorOption["layoutInfo"] = 151] = "layoutInfo";
    EditorOption[EditorOption["wrappingInfo"] = 152] = "wrappingInfo";
    EditorOption[EditorOption["defaultColorDecorators"] = 153] = "defaultColorDecorators";
    EditorOption[EditorOption["colorDecoratorsActivatedOn"] = 154] = "colorDecoratorsActivatedOn";
    EditorOption[EditorOption["inlineCompletionsAccessibilityVerbose"] = 155] = "inlineCompletionsAccessibilityVerbose";
    EditorOption[EditorOption["effectiveExperimentalEditContextEnabled"] = 156] = "effectiveExperimentalEditContextEnabled";
})(EditorOption || (EditorOption = {}));
export const EditorOptions = {
    acceptSuggestionOnCommitCharacter: register(new EditorBooleanOption(0 /* EditorOption.acceptSuggestionOnCommitCharacter */, 'acceptSuggestionOnCommitCharacter', true, {
        markdownDescription: nls.localize('acceptSuggestionOnCommitCharacter', 'Controls whether suggestions should be accepted on commit characters. For example, in JavaScript, the semi-colon (`;`) can be a commit character that accepts a suggestion and types that character.'),
    })),
    acceptSuggestionOnEnter: register(new EditorStringEnumOption(1 /* EditorOption.acceptSuggestionOnEnter */, 'acceptSuggestionOnEnter', 'on', ['on', 'smart', 'off'], {
        markdownEnumDescriptions: [
            '',
            nls.localize('acceptSuggestionOnEnterSmart', 'Only accept a suggestion with `Enter` when it makes a textual change.'),
            '',
        ],
        markdownDescription: nls.localize('acceptSuggestionOnEnter', 'Controls whether suggestions should be accepted on `Enter`, in addition to `Tab`. Helps to avoid ambiguity between inserting new lines or accepting suggestions.'),
    })),
    accessibilitySupport: register(new EditorAccessibilitySupport()),
    accessibilityPageSize: register(new EditorIntOption(3 /* EditorOption.accessibilityPageSize */, 'accessibilityPageSize', 500, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('accessibilityPageSize', 'Controls the number of lines in the editor that can be read out by a screen reader at once. When we detect a screen reader we automatically set the default to be 500. Warning: this has a performance implication for numbers larger than the default.'),
        tags: ['accessibility'],
    })),
    ariaLabel: register(new EditorStringOption(4 /* EditorOption.ariaLabel */, 'ariaLabel', nls.localize('editorViewAccessibleLabel', 'Editor content'))),
    ariaRequired: register(new EditorBooleanOption(5 /* EditorOption.ariaRequired */, 'ariaRequired', false, undefined)),
    screenReaderAnnounceInlineSuggestion: register(new EditorBooleanOption(8 /* EditorOption.screenReaderAnnounceInlineSuggestion */, 'screenReaderAnnounceInlineSuggestion', true, {
        description: nls.localize('screenReaderAnnounceInlineSuggestion', 'Control whether inline suggestions are announced by a screen reader.'),
        tags: ['accessibility'],
    })),
    autoClosingBrackets: register(new EditorStringEnumOption(6 /* EditorOption.autoClosingBrackets */, 'autoClosingBrackets', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingBrackets.languageDefined', 'Use language configurations to determine when to autoclose brackets.'),
            nls.localize('editor.autoClosingBrackets.beforeWhitespace', 'Autoclose brackets only when the cursor is to the left of whitespace.'),
            '',
        ],
        description: nls.localize('autoClosingBrackets', 'Controls whether the editor should automatically close brackets after the user adds an opening bracket.'),
    })),
    autoClosingComments: register(new EditorStringEnumOption(7 /* EditorOption.autoClosingComments */, 'autoClosingComments', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingComments.languageDefined', 'Use language configurations to determine when to autoclose comments.'),
            nls.localize('editor.autoClosingComments.beforeWhitespace', 'Autoclose comments only when the cursor is to the left of whitespace.'),
            '',
        ],
        description: nls.localize('autoClosingComments', 'Controls whether the editor should automatically close comments after the user adds an opening comment.'),
    })),
    autoClosingDelete: register(new EditorStringEnumOption(9 /* EditorOption.autoClosingDelete */, 'autoClosingDelete', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingDelete.auto', 'Remove adjacent closing quotes or brackets only if they were automatically inserted.'),
            '',
        ],
        description: nls.localize('autoClosingDelete', 'Controls whether the editor should remove adjacent closing quotes or brackets when deleting.'),
    })),
    autoClosingOvertype: register(new EditorStringEnumOption(10 /* EditorOption.autoClosingOvertype */, 'autoClosingOvertype', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingOvertype.auto', 'Type over closing quotes or brackets only if they were automatically inserted.'),
            '',
        ],
        description: nls.localize('autoClosingOvertype', 'Controls whether the editor should type over closing quotes or brackets.'),
    })),
    autoClosingQuotes: register(new EditorStringEnumOption(11 /* EditorOption.autoClosingQuotes */, 'autoClosingQuotes', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingQuotes.languageDefined', 'Use language configurations to determine when to autoclose quotes.'),
            nls.localize('editor.autoClosingQuotes.beforeWhitespace', 'Autoclose quotes only when the cursor is to the left of whitespace.'),
            '',
        ],
        description: nls.localize('autoClosingQuotes', 'Controls whether the editor should automatically close quotes after the user adds an opening quote.'),
    })),
    autoIndent: register(new EditorEnumOption(12 /* EditorOption.autoIndent */, 'autoIndent', 4 /* EditorAutoIndentStrategy.Full */, 'full', ['none', 'keep', 'brackets', 'advanced', 'full'], _autoIndentFromString, {
        enumDescriptions: [
            nls.localize('editor.autoIndent.none', 'The editor will not insert indentation automatically.'),
            nls.localize('editor.autoIndent.keep', "The editor will keep the current line's indentation."),
            nls.localize('editor.autoIndent.brackets', "The editor will keep the current line's indentation and honor language defined brackets."),
            nls.localize('editor.autoIndent.advanced', "The editor will keep the current line's indentation, honor language defined brackets and invoke special onEnterRules defined by languages."),
            nls.localize('editor.autoIndent.full', "The editor will keep the current line's indentation, honor language defined brackets, invoke special onEnterRules defined by languages, and honor indentationRules defined by languages."),
        ],
        description: nls.localize('autoIndent', 'Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.'),
    })),
    automaticLayout: register(new EditorBooleanOption(13 /* EditorOption.automaticLayout */, 'automaticLayout', false)),
    autoSurround: register(new EditorStringEnumOption(14 /* EditorOption.autoSurround */, 'autoSurround', 'languageDefined', ['languageDefined', 'quotes', 'brackets', 'never'], {
        enumDescriptions: [
            nls.localize('editor.autoSurround.languageDefined', 'Use language configurations to determine when to automatically surround selections.'),
            nls.localize('editor.autoSurround.quotes', 'Surround with quotes but not brackets.'),
            nls.localize('editor.autoSurround.brackets', 'Surround with brackets but not quotes.'),
            '',
        ],
        description: nls.localize('autoSurround', 'Controls whether the editor should automatically surround selections when typing quotes or brackets.'),
    })),
    bracketPairColorization: register(new BracketPairColorization()),
    bracketPairGuides: register(new GuideOptions()),
    stickyTabStops: register(new EditorBooleanOption(121 /* EditorOption.stickyTabStops */, 'stickyTabStops', false, {
        description: nls.localize('stickyTabStops', 'Emulate selection behavior of tab characters when using spaces for indentation. Selection will stick to tab stops.'),
    })),
    codeLens: register(new EditorBooleanOption(17 /* EditorOption.codeLens */, 'codeLens', true, {
        description: nls.localize('codeLens', 'Controls whether the editor shows CodeLens.'),
    })),
    codeLensFontFamily: register(new EditorStringOption(18 /* EditorOption.codeLensFontFamily */, 'codeLensFontFamily', '', {
        description: nls.localize('codeLensFontFamily', 'Controls the font family for CodeLens.'),
    })),
    codeLensFontSize: register(new EditorIntOption(19 /* EditorOption.codeLensFontSize */, 'codeLensFontSize', 0, 0, 100, {
        type: 'number',
        default: 0,
        minimum: 0,
        maximum: 100,
        markdownDescription: nls.localize('codeLensFontSize', 'Controls the font size in pixels for CodeLens. When set to 0, 90% of `#editor.fontSize#` is used.'),
    })),
    colorDecorators: register(new EditorBooleanOption(20 /* EditorOption.colorDecorators */, 'colorDecorators', true, {
        description: nls.localize('colorDecorators', 'Controls whether the editor should render the inline color decorators and color picker.'),
    })),
    colorDecoratorActivatedOn: register(new EditorStringEnumOption(154 /* EditorOption.colorDecoratorsActivatedOn */, 'colorDecoratorsActivatedOn', 'clickAndHover', ['clickAndHover', 'hover', 'click'], {
        enumDescriptions: [
            nls.localize('editor.colorDecoratorActivatedOn.clickAndHover', 'Make the color picker appear both on click and hover of the color decorator'),
            nls.localize('editor.colorDecoratorActivatedOn.hover', 'Make the color picker appear on hover of the color decorator'),
            nls.localize('editor.colorDecoratorActivatedOn.click', 'Make the color picker appear on click of the color decorator'),
        ],
        description: nls.localize('colorDecoratorActivatedOn', 'Controls the condition to make a color picker appear from a color decorator.'),
    })),
    colorDecoratorsLimit: register(new EditorIntOption(21 /* EditorOption.colorDecoratorsLimit */, 'colorDecoratorsLimit', 500, 1, 1000000, {
        markdownDescription: nls.localize('colorDecoratorsLimit', 'Controls the max number of color decorators that can be rendered in an editor at once.'),
    })),
    columnSelection: register(new EditorBooleanOption(22 /* EditorOption.columnSelection */, 'columnSelection', false, {
        description: nls.localize('columnSelection', 'Enable that the selection with the mouse and keys is doing column selection.'),
    })),
    comments: register(new EditorComments()),
    contextmenu: register(new EditorBooleanOption(24 /* EditorOption.contextmenu */, 'contextmenu', true)),
    copyWithSyntaxHighlighting: register(new EditorBooleanOption(25 /* EditorOption.copyWithSyntaxHighlighting */, 'copyWithSyntaxHighlighting', true, {
        description: nls.localize('copyWithSyntaxHighlighting', 'Controls whether syntax highlighting should be copied into the clipboard.'),
    })),
    cursorBlinking: register(new EditorEnumOption(26 /* EditorOption.cursorBlinking */, 'cursorBlinking', 1 /* TextEditorCursorBlinkingStyle.Blink */, 'blink', ['blink', 'smooth', 'phase', 'expand', 'solid'], cursorBlinkingStyleFromString, { description: nls.localize('cursorBlinking', 'Control the cursor animation style.') })),
    cursorSmoothCaretAnimation: register(new EditorStringEnumOption(27 /* EditorOption.cursorSmoothCaretAnimation */, 'cursorSmoothCaretAnimation', 'off', ['off', 'explicit', 'on'], {
        enumDescriptions: [
            nls.localize('cursorSmoothCaretAnimation.off', 'Smooth caret animation is disabled.'),
            nls.localize('cursorSmoothCaretAnimation.explicit', 'Smooth caret animation is enabled only when the user moves the cursor with an explicit gesture.'),
            nls.localize('cursorSmoothCaretAnimation.on', 'Smooth caret animation is always enabled.'),
        ],
        description: nls.localize('cursorSmoothCaretAnimation', 'Controls whether the smooth caret animation should be enabled.'),
    })),
    cursorStyle: register(new EditorEnumOption(28 /* EditorOption.cursorStyle */, 'cursorStyle', TextEditorCursorStyle.Line, 'line', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, {
        description: nls.localize('cursorStyle', 'Controls the cursor style in insert input mode.'),
    })),
    overtypeCursorStyle: register(new EditorEnumOption(84 /* EditorOption.overtypeCursorStyle */, 'overtypeCursorStyle', TextEditorCursorStyle.Block, 'block', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, {
        description: nls.localize('overtypeCursorStyle', 'Controls the cursor style in overtype input mode.'),
    })),
    cursorSurroundingLines: register(new EditorIntOption(29 /* EditorOption.cursorSurroundingLines */, 'cursorSurroundingLines', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('cursorSurroundingLines', "Controls the minimal number of visible leading lines (minimum 0) and trailing lines (minimum 1) surrounding the cursor. Known as 'scrollOff' or 'scrollOffset' in some other editors."),
    })),
    cursorSurroundingLinesStyle: register(new EditorStringEnumOption(30 /* EditorOption.cursorSurroundingLinesStyle */, 'cursorSurroundingLinesStyle', 'default', ['default', 'all'], {
        enumDescriptions: [
            nls.localize('cursorSurroundingLinesStyle.default', '`cursorSurroundingLines` is enforced only when triggered via the keyboard or API.'),
            nls.localize('cursorSurroundingLinesStyle.all', '`cursorSurroundingLines` is enforced always.'),
        ],
        markdownDescription: nls.localize('cursorSurroundingLinesStyle', 'Controls when `#editor.cursorSurroundingLines#` should be enforced.'),
    })),
    cursorWidth: register(new EditorIntOption(31 /* EditorOption.cursorWidth */, 'cursorWidth', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        markdownDescription: nls.localize('cursorWidth', 'Controls the width of the cursor when `#editor.cursorStyle#` is set to `line`.'),
    })),
    disableLayerHinting: register(new EditorBooleanOption(32 /* EditorOption.disableLayerHinting */, 'disableLayerHinting', false)),
    disableMonospaceOptimizations: register(new EditorBooleanOption(33 /* EditorOption.disableMonospaceOptimizations */, 'disableMonospaceOptimizations', false)),
    domReadOnly: register(new EditorBooleanOption(34 /* EditorOption.domReadOnly */, 'domReadOnly', false)),
    dragAndDrop: register(new EditorBooleanOption(35 /* EditorOption.dragAndDrop */, 'dragAndDrop', true, {
        description: nls.localize('dragAndDrop', 'Controls whether the editor should allow moving selections via drag and drop.'),
    })),
    emptySelectionClipboard: register(new EditorEmptySelectionClipboard()),
    dropIntoEditor: register(new EditorDropIntoEditor()),
    experimentalEditContextEnabled: register(new EditorBooleanOption(37 /* EditorOption.experimentalEditContextEnabled */, 'experimentalEditContextEnabled', product.quality !== 'stable', {
        description: nls.localize('experimentalEditContextEnabled', 'Sets whether the new experimental edit context should be used instead of the text area.'),
        included: platform.isChrome || platform.isEdge || platform.isNative,
    })),
    stickyScroll: register(new EditorStickyScroll()),
    experimentalGpuAcceleration: register(new EditorStringEnumOption(39 /* EditorOption.experimentalGpuAcceleration */, 'experimentalGpuAcceleration', 'off', ['off', 'on'], {
        tags: ['experimental'],
        enumDescriptions: [
            nls.localize('experimentalGpuAcceleration.off', 'Use regular DOM-based rendering.'),
            nls.localize('experimentalGpuAcceleration.on', 'Use GPU acceleration.'),
        ],
        description: nls.localize('experimentalGpuAcceleration', 'Controls whether to use the experimental GPU acceleration to render the editor.'),
    })),
    experimentalWhitespaceRendering: register(new EditorStringEnumOption(40 /* EditorOption.experimentalWhitespaceRendering */, 'experimentalWhitespaceRendering', 'svg', ['svg', 'font', 'off'], {
        enumDescriptions: [
            nls.localize('experimentalWhitespaceRendering.svg', 'Use a new rendering method with svgs.'),
            nls.localize('experimentalWhitespaceRendering.font', 'Use a new rendering method with font characters.'),
            nls.localize('experimentalWhitespaceRendering.off', 'Use the stable rendering method.'),
        ],
        description: nls.localize('experimentalWhitespaceRendering', 'Controls whether whitespace is rendered with a new, experimental method.'),
    })),
    extraEditorClassName: register(new EditorStringOption(41 /* EditorOption.extraEditorClassName */, 'extraEditorClassName', '')),
    fastScrollSensitivity: register(new EditorFloatOption(42 /* EditorOption.fastScrollSensitivity */, 'fastScrollSensitivity', 5, (x) => (x <= 0 ? 5 : x), {
        markdownDescription: nls.localize('fastScrollSensitivity', 'Scrolling speed multiplier when pressing `Alt`.'),
    })),
    find: register(new EditorFind()),
    fixedOverflowWidgets: register(new EditorBooleanOption(44 /* EditorOption.fixedOverflowWidgets */, 'fixedOverflowWidgets', false)),
    folding: register(new EditorBooleanOption(45 /* EditorOption.folding */, 'folding', true, {
        description: nls.localize('folding', 'Controls whether the editor has code folding enabled.'),
    })),
    foldingStrategy: register(new EditorStringEnumOption(46 /* EditorOption.foldingStrategy */, 'foldingStrategy', 'auto', ['auto', 'indentation'], {
        enumDescriptions: [
            nls.localize('foldingStrategy.auto', 'Use a language-specific folding strategy if available, else the indentation-based one.'),
            nls.localize('foldingStrategy.indentation', 'Use the indentation-based folding strategy.'),
        ],
        description: nls.localize('foldingStrategy', 'Controls the strategy for computing folding ranges.'),
    })),
    foldingHighlight: register(new EditorBooleanOption(47 /* EditorOption.foldingHighlight */, 'foldingHighlight', true, {
        description: nls.localize('foldingHighlight', 'Controls whether the editor should highlight folded ranges.'),
    })),
    foldingImportsByDefault: register(new EditorBooleanOption(48 /* EditorOption.foldingImportsByDefault */, 'foldingImportsByDefault', false, {
        description: nls.localize('foldingImportsByDefault', 'Controls whether the editor automatically collapses import ranges.'),
    })),
    foldingMaximumRegions: register(new EditorIntOption(49 /* EditorOption.foldingMaximumRegions */, 'foldingMaximumRegions', 5000, 10, 65000, // limit must be less than foldingRanges MAX_FOLDING_REGIONS
    {
        description: nls.localize('foldingMaximumRegions', 'The maximum number of foldable regions. Increasing this value may result in the editor becoming less responsive when the current source has a large number of foldable regions.'),
    })),
    unfoldOnClickAfterEndOfLine: register(new EditorBooleanOption(50 /* EditorOption.unfoldOnClickAfterEndOfLine */, 'unfoldOnClickAfterEndOfLine', false, {
        description: nls.localize('unfoldOnClickAfterEndOfLine', 'Controls whether clicking on the empty content after a folded line will unfold the line.'),
    })),
    fontFamily: register(new EditorStringOption(51 /* EditorOption.fontFamily */, 'fontFamily', EDITOR_FONT_DEFAULTS.fontFamily, {
        description: nls.localize('fontFamily', 'Controls the font family.'),
    })),
    fontInfo: register(new EditorFontInfo()),
    fontLigatures2: register(new EditorFontLigatures()),
    fontSize: register(new EditorFontSize()),
    fontWeight: register(new EditorFontWeight()),
    fontVariations: register(new EditorFontVariations()),
    formatOnPaste: register(new EditorBooleanOption(57 /* EditorOption.formatOnPaste */, 'formatOnPaste', false, {
        description: nls.localize('formatOnPaste', 'Controls whether the editor should automatically format the pasted content. A formatter must be available and the formatter should be able to format a range in a document.'),
    })),
    formatOnType: register(new EditorBooleanOption(58 /* EditorOption.formatOnType */, 'formatOnType', false, {
        description: nls.localize('formatOnType', 'Controls whether the editor should automatically format the line after typing.'),
    })),
    glyphMargin: register(new EditorBooleanOption(59 /* EditorOption.glyphMargin */, 'glyphMargin', true, {
        description: nls.localize('glyphMargin', 'Controls whether the editor should render the vertical glyph margin. Glyph margin is mostly used for debugging.'),
    })),
    gotoLocation: register(new EditorGoToLocation()),
    hideCursorInOverviewRuler: register(new EditorBooleanOption(61 /* EditorOption.hideCursorInOverviewRuler */, 'hideCursorInOverviewRuler', false, {
        description: nls.localize('hideCursorInOverviewRuler', 'Controls whether the cursor should be hidden in the overview ruler.'),
    })),
    hover: register(new EditorHover()),
    inDiffEditor: register(new EditorBooleanOption(63 /* EditorOption.inDiffEditor */, 'inDiffEditor', false)),
    letterSpacing: register(new EditorFloatOption(65 /* EditorOption.letterSpacing */, 'letterSpacing', EDITOR_FONT_DEFAULTS.letterSpacing, (x) => EditorFloatOption.clamp(x, -5, 20), { description: nls.localize('letterSpacing', 'Controls the letter spacing in pixels.') })),
    lightbulb: register(new EditorLightbulb()),
    lineDecorationsWidth: register(new EditorLineDecorationsWidth()),
    lineHeight: register(new EditorLineHeight()),
    lineNumbers: register(new EditorRenderLineNumbersOption()),
    lineNumbersMinChars: register(new EditorIntOption(70 /* EditorOption.lineNumbersMinChars */, 'lineNumbersMinChars', 5, 1, 300)),
    linkedEditing: register(new EditorBooleanOption(71 /* EditorOption.linkedEditing */, 'linkedEditing', false, {
        description: nls.localize('linkedEditing', 'Controls whether the editor has linked editing enabled. Depending on the language, related symbols such as HTML tags, are updated while editing.'),
    })),
    links: register(new EditorBooleanOption(72 /* EditorOption.links */, 'links', true, {
        description: nls.localize('links', 'Controls whether the editor should detect links and make them clickable.'),
    })),
    matchBrackets: register(new EditorStringEnumOption(73 /* EditorOption.matchBrackets */, 'matchBrackets', 'always', ['always', 'near', 'never'], { description: nls.localize('matchBrackets', 'Highlight matching brackets.') })),
    minimap: register(new EditorMinimap()),
    mouseStyle: register(new EditorStringEnumOption(75 /* EditorOption.mouseStyle */, 'mouseStyle', 'text', ['text', 'default', 'copy'])),
    mouseWheelScrollSensitivity: register(new EditorFloatOption(76 /* EditorOption.mouseWheelScrollSensitivity */, 'mouseWheelScrollSensitivity', 1, (x) => (x === 0 ? 1 : x), {
        markdownDescription: nls.localize('mouseWheelScrollSensitivity', 'A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.'),
    })),
    mouseWheelZoom: register(new EditorBooleanOption(77 /* EditorOption.mouseWheelZoom */, 'mouseWheelZoom', false, {
        markdownDescription: platform.isMacintosh
            ? nls.localize('mouseWheelZoom.mac', 'Zoom the font of the editor when using mouse wheel and holding `Cmd`.')
            : nls.localize('mouseWheelZoom', 'Zoom the font of the editor when using mouse wheel and holding `Ctrl`.'),
    })),
    multiCursorMergeOverlapping: register(new EditorBooleanOption(78 /* EditorOption.multiCursorMergeOverlapping */, 'multiCursorMergeOverlapping', true, {
        description: nls.localize('multiCursorMergeOverlapping', 'Merge multiple cursors when they are overlapping.'),
    })),
    multiCursorModifier: register(new EditorEnumOption(79 /* EditorOption.multiCursorModifier */, 'multiCursorModifier', 'altKey', 'alt', ['ctrlCmd', 'alt'], _multiCursorModifierFromString, {
        markdownEnumDescriptions: [
            nls.localize('multiCursorModifier.ctrlCmd', 'Maps to `Control` on Windows and Linux and to `Command` on macOS.'),
            nls.localize('multiCursorModifier.alt', 'Maps to `Alt` on Windows and Linux and to `Option` on macOS.'),
        ],
        markdownDescription: nls.localize({
            key: 'multiCursorModifier',
            comment: [
                '- `ctrlCmd` refers to a value the setting can take and should not be localized.',
                '- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyboard and can be localized.',
            ],
        }, 'The modifier to be used to add multiple cursors with the mouse. The Go to Definition and Open Link mouse gestures will adapt such that they do not conflict with the [multicursor modifier](https://code.visualstudio.com/docs/editor/codebasics#_multicursor-modifier).'),
    })),
    multiCursorPaste: register(new EditorStringEnumOption(80 /* EditorOption.multiCursorPaste */, 'multiCursorPaste', 'spread', ['spread', 'full'], {
        markdownEnumDescriptions: [
            nls.localize('multiCursorPaste.spread', 'Each cursor pastes a single line of the text.'),
            nls.localize('multiCursorPaste.full', 'Each cursor pastes the full text.'),
        ],
        markdownDescription: nls.localize('multiCursorPaste', 'Controls pasting when the line count of the pasted text matches the cursor count.'),
    })),
    multiCursorLimit: register(new EditorIntOption(81 /* EditorOption.multiCursorLimit */, 'multiCursorLimit', 10000, 1, 100000, {
        markdownDescription: nls.localize('multiCursorLimit', 'Controls the max number of cursors that can be in an active editor at once.'),
    })),
    occurrencesHighlight: register(new EditorStringEnumOption(82 /* EditorOption.occurrencesHighlight */, 'occurrencesHighlight', 'singleFile', ['off', 'singleFile', 'multiFile'], {
        markdownEnumDescriptions: [
            nls.localize('occurrencesHighlight.off', 'Does not highlight occurrences.'),
            nls.localize('occurrencesHighlight.singleFile', 'Highlights occurrences only in the current file.'),
            nls.localize('occurrencesHighlight.multiFile', 'Experimental: Highlights occurrences across all valid open files.'),
        ],
        markdownDescription: nls.localize('occurrencesHighlight', 'Controls whether occurrences should be highlighted across open files.'),
    })),
    occurrencesHighlightDelay: register(new EditorIntOption(83 /* EditorOption.occurrencesHighlightDelay */, 'occurrencesHighlightDelay', 0, 0, 2000, {
        description: nls.localize('occurrencesHighlightDelay', 'Controls the delay in milliseconds after which occurrences are highlighted.'),
        tags: ['preview'],
    })),
    overtypeOnPaste: register(new EditorBooleanOption(85 /* EditorOption.overtypeOnPaste */, 'overtypeOnPaste', true, {
        description: nls.localize('overtypeOnPaste', 'Controls whether pasting should overtype.'),
    })),
    overviewRulerBorder: register(new EditorBooleanOption(86 /* EditorOption.overviewRulerBorder */, 'overviewRulerBorder', true, {
        description: nls.localize('overviewRulerBorder', 'Controls whether a border should be drawn around the overview ruler.'),
    })),
    overviewRulerLanes: register(new EditorIntOption(87 /* EditorOption.overviewRulerLanes */, 'overviewRulerLanes', 3, 0, 3)),
    padding: register(new EditorPadding()),
    pasteAs: register(new EditorPasteAs()),
    parameterHints: register(new EditorParameterHints()),
    peekWidgetDefaultFocus: register(new EditorStringEnumOption(91 /* EditorOption.peekWidgetDefaultFocus */, 'peekWidgetDefaultFocus', 'tree', ['tree', 'editor'], {
        enumDescriptions: [
            nls.localize('peekWidgetDefaultFocus.tree', 'Focus the tree when opening peek'),
            nls.localize('peekWidgetDefaultFocus.editor', 'Focus the editor when opening peek'),
        ],
        description: nls.localize('peekWidgetDefaultFocus', 'Controls whether to focus the inline editor or the tree in the peek widget.'),
    })),
    placeholder: register(new PlaceholderOption()),
    definitionLinkOpensInPeek: register(new EditorBooleanOption(93 /* EditorOption.definitionLinkOpensInPeek */, 'definitionLinkOpensInPeek', false, {
        description: nls.localize('definitionLinkOpensInPeek', 'Controls whether the Go to Definition mouse gesture always opens the peek widget.'),
    })),
    quickSuggestions: register(new EditorQuickSuggestions()),
    quickSuggestionsDelay: register(new EditorIntOption(95 /* EditorOption.quickSuggestionsDelay */, 'quickSuggestionsDelay', 10, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('quickSuggestionsDelay', 'Controls the delay in milliseconds after which quick suggestions will show up.'),
    })),
    readOnly: register(new EditorBooleanOption(96 /* EditorOption.readOnly */, 'readOnly', false)),
    readOnlyMessage: register(new ReadonlyMessage()),
    renameOnType: register(new EditorBooleanOption(98 /* EditorOption.renameOnType */, 'renameOnType', false, {
        description: nls.localize('renameOnType', 'Controls whether the editor auto renames on type.'),
        markdownDeprecationMessage: nls.localize('renameOnTypeDeprecate', 'Deprecated, use `editor.linkedEditing` instead.'),
    })),
    renderControlCharacters: register(new EditorBooleanOption(99 /* EditorOption.renderControlCharacters */, 'renderControlCharacters', true, {
        description: nls.localize('renderControlCharacters', 'Controls whether the editor should render control characters.'),
        restricted: true,
    })),
    renderFinalNewline: register(new EditorStringEnumOption(100 /* EditorOption.renderFinalNewline */, 'renderFinalNewline', (platform.isLinux ? 'dimmed' : 'on'), ['off', 'on', 'dimmed'], {
        description: nls.localize('renderFinalNewline', 'Render last line number when the file ends with a newline.'),
    })),
    renderLineHighlight: register(new EditorStringEnumOption(101 /* EditorOption.renderLineHighlight */, 'renderLineHighlight', 'line', ['none', 'gutter', 'line', 'all'], {
        enumDescriptions: [
            '',
            '',
            '',
            nls.localize('renderLineHighlight.all', 'Highlights both the gutter and the current line.'),
        ],
        description: nls.localize('renderLineHighlight', 'Controls how the editor should render the current line highlight.'),
    })),
    renderLineHighlightOnlyWhenFocus: register(new EditorBooleanOption(102 /* EditorOption.renderLineHighlightOnlyWhenFocus */, 'renderLineHighlightOnlyWhenFocus', false, {
        description: nls.localize('renderLineHighlightOnlyWhenFocus', 'Controls if the editor should render the current line highlight only when the editor is focused.'),
    })),
    renderValidationDecorations: register(new EditorStringEnumOption(103 /* EditorOption.renderValidationDecorations */, 'renderValidationDecorations', 'editable', ['editable', 'on', 'off'])),
    renderWhitespace: register(new EditorStringEnumOption(104 /* EditorOption.renderWhitespace */, 'renderWhitespace', 'selection', ['none', 'boundary', 'selection', 'trailing', 'all'], {
        enumDescriptions: [
            '',
            nls.localize('renderWhitespace.boundary', 'Render whitespace characters except for single spaces between words.'),
            nls.localize('renderWhitespace.selection', 'Render whitespace characters only on selected text.'),
            nls.localize('renderWhitespace.trailing', 'Render only trailing whitespace characters.'),
            '',
        ],
        description: nls.localize('renderWhitespace', 'Controls how the editor should render whitespace characters.'),
    })),
    revealHorizontalRightPadding: register(new EditorIntOption(105 /* EditorOption.revealHorizontalRightPadding */, 'revealHorizontalRightPadding', 15, 0, 1000)),
    roundedSelection: register(new EditorBooleanOption(106 /* EditorOption.roundedSelection */, 'roundedSelection', true, {
        description: nls.localize('roundedSelection', 'Controls whether selections should have rounded corners.'),
    })),
    rulers: register(new EditorRulers()),
    scrollbar: register(new EditorScrollbar()),
    scrollBeyondLastColumn: register(new EditorIntOption(109 /* EditorOption.scrollBeyondLastColumn */, 'scrollBeyondLastColumn', 4, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('scrollBeyondLastColumn', 'Controls the number of extra characters beyond which the editor will scroll horizontally.'),
    })),
    scrollBeyondLastLine: register(new EditorBooleanOption(110 /* EditorOption.scrollBeyondLastLine */, 'scrollBeyondLastLine', true, {
        description: nls.localize('scrollBeyondLastLine', 'Controls whether the editor will scroll beyond the last line.'),
    })),
    scrollPredominantAxis: register(new EditorBooleanOption(111 /* EditorOption.scrollPredominantAxis */, 'scrollPredominantAxis', true, {
        description: nls.localize('scrollPredominantAxis', 'Scroll only along the predominant axis when scrolling both vertically and horizontally at the same time. Prevents horizontal drift when scrolling vertically on a trackpad.'),
    })),
    selectionClipboard: register(new EditorBooleanOption(112 /* EditorOption.selectionClipboard */, 'selectionClipboard', true, {
        description: nls.localize('selectionClipboard', 'Controls whether the Linux primary clipboard should be supported.'),
        included: platform.isLinux,
    })),
    selectionHighlight: register(new EditorBooleanOption(113 /* EditorOption.selectionHighlight */, 'selectionHighlight', true, {
        description: nls.localize('selectionHighlight', 'Controls whether the editor should highlight matches similar to the selection.'),
    })),
    selectOnLineNumbers: register(new EditorBooleanOption(114 /* EditorOption.selectOnLineNumbers */, 'selectOnLineNumbers', true)),
    showFoldingControls: register(new EditorStringEnumOption(115 /* EditorOption.showFoldingControls */, 'showFoldingControls', 'mouseover', ['always', 'never', 'mouseover'], {
        enumDescriptions: [
            nls.localize('showFoldingControls.always', 'Always show the folding controls.'),
            nls.localize('showFoldingControls.never', 'Never show the folding controls and reduce the gutter size.'),
            nls.localize('showFoldingControls.mouseover', 'Only show the folding controls when the mouse is over the gutter.'),
        ],
        description: nls.localize('showFoldingControls', 'Controls when the folding controls on the gutter are shown.'),
    })),
    showUnused: register(new EditorBooleanOption(116 /* EditorOption.showUnused */, 'showUnused', true, {
        description: nls.localize('showUnused', 'Controls fading out of unused code.'),
    })),
    showDeprecated: register(new EditorBooleanOption(145 /* EditorOption.showDeprecated */, 'showDeprecated', true, {
        description: nls.localize('showDeprecated', 'Controls strikethrough deprecated variables.'),
    })),
    inlayHints: register(new EditorInlayHints()),
    snippetSuggestions: register(new EditorStringEnumOption(117 /* EditorOption.snippetSuggestions */, 'snippetSuggestions', 'inline', ['top', 'bottom', 'inline', 'none'], {
        enumDescriptions: [
            nls.localize('snippetSuggestions.top', 'Show snippet suggestions on top of other suggestions.'),
            nls.localize('snippetSuggestions.bottom', 'Show snippet suggestions below other suggestions.'),
            nls.localize('snippetSuggestions.inline', 'Show snippets suggestions with other suggestions.'),
            nls.localize('snippetSuggestions.none', 'Do not show snippet suggestions.'),
        ],
        description: nls.localize('snippetSuggestions', 'Controls whether snippets are shown with other suggestions and how they are sorted.'),
    })),
    smartSelect: register(new SmartSelect()),
    smoothScrolling: register(new EditorBooleanOption(119 /* EditorOption.smoothScrolling */, 'smoothScrolling', false, {
        description: nls.localize('smoothScrolling', 'Controls whether the editor will scroll using an animation.'),
    })),
    stopRenderingLineAfter: register(new EditorIntOption(122 /* EditorOption.stopRenderingLineAfter */, 'stopRenderingLineAfter', 10000, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    suggest: register(new EditorSuggest()),
    inlineSuggest: register(new InlineEditorSuggest()),
    inlineCompletionsAccessibilityVerbose: register(new EditorBooleanOption(155 /* EditorOption.inlineCompletionsAccessibilityVerbose */, 'inlineCompletionsAccessibilityVerbose', false, {
        description: nls.localize('inlineCompletionsAccessibilityVerbose', 'Controls whether the accessibility hint should be provided to screen reader users when an inline completion is shown.'),
    })),
    suggestFontSize: register(new EditorIntOption(124 /* EditorOption.suggestFontSize */, 'suggestFontSize', 0, 0, 1000, {
        markdownDescription: nls.localize('suggestFontSize', 'Font size for the suggest widget. When set to {0}, the value of {1} is used.', '`0`', '`#editor.fontSize#`'),
    })),
    suggestLineHeight: register(new EditorIntOption(125 /* EditorOption.suggestLineHeight */, 'suggestLineHeight', 0, 0, 1000, {
        markdownDescription: nls.localize('suggestLineHeight', 'Line height for the suggest widget. When set to {0}, the value of {1} is used. The minimum value is 8.', '`0`', '`#editor.lineHeight#`'),
    })),
    suggestOnTriggerCharacters: register(new EditorBooleanOption(126 /* EditorOption.suggestOnTriggerCharacters */, 'suggestOnTriggerCharacters', true, {
        description: nls.localize('suggestOnTriggerCharacters', 'Controls whether suggestions should automatically show up when typing trigger characters.'),
    })),
    suggestSelection: register(new EditorStringEnumOption(127 /* EditorOption.suggestSelection */, 'suggestSelection', 'first', ['first', 'recentlyUsed', 'recentlyUsedByPrefix'], {
        markdownEnumDescriptions: [
            nls.localize('suggestSelection.first', 'Always select the first suggestion.'),
            nls.localize('suggestSelection.recentlyUsed', 'Select recent suggestions unless further typing selects one, e.g. `console.| -> console.log` because `log` has been completed recently.'),
            nls.localize('suggestSelection.recentlyUsedByPrefix', 'Select suggestions based on previous prefixes that have completed those suggestions, e.g. `co -> console` and `con -> const`.'),
        ],
        description: nls.localize('suggestSelection', 'Controls how suggestions are pre-selected when showing the suggest list.'),
    })),
    tabCompletion: register(new EditorStringEnumOption(128 /* EditorOption.tabCompletion */, 'tabCompletion', 'off', ['on', 'off', 'onlySnippets'], {
        enumDescriptions: [
            nls.localize('tabCompletion.on', 'Tab complete will insert the best matching suggestion when pressing tab.'),
            nls.localize('tabCompletion.off', 'Disable tab completions.'),
            nls.localize('tabCompletion.onlySnippets', "Tab complete snippets when their prefix match. Works best when 'quickSuggestions' aren't enabled."),
        ],
        description: nls.localize('tabCompletion', 'Enables tab completions.'),
    })),
    tabIndex: register(new EditorIntOption(129 /* EditorOption.tabIndex */, 'tabIndex', 0, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    unicodeHighlight: register(new UnicodeHighlight()),
    unusualLineTerminators: register(new EditorStringEnumOption(131 /* EditorOption.unusualLineTerminators */, 'unusualLineTerminators', 'prompt', ['auto', 'off', 'prompt'], {
        enumDescriptions: [
            nls.localize('unusualLineTerminators.auto', 'Unusual line terminators are automatically removed.'),
            nls.localize('unusualLineTerminators.off', 'Unusual line terminators are ignored.'),
            nls.localize('unusualLineTerminators.prompt', 'Unusual line terminators prompt to be removed.'),
        ],
        description: nls.localize('unusualLineTerminators', 'Remove unusual line terminators that might cause problems.'),
    })),
    useShadowDOM: register(new EditorBooleanOption(132 /* EditorOption.useShadowDOM */, 'useShadowDOM', true)),
    useTabStops: register(new EditorBooleanOption(133 /* EditorOption.useTabStops */, 'useTabStops', true, {
        description: nls.localize('useTabStops', 'Spaces and tabs are inserted and deleted in alignment with tab stops.'),
    })),
    wordBreak: register(new EditorStringEnumOption(134 /* EditorOption.wordBreak */, 'wordBreak', 'normal', ['normal', 'keepAll'], {
        markdownEnumDescriptions: [
            nls.localize('wordBreak.normal', 'Use the default line break rule.'),
            nls.localize('wordBreak.keepAll', 'Word breaks should not be used for Chinese/Japanese/Korean (CJK) text. Non-CJK text behavior is the same as for normal.'),
        ],
        description: nls.localize('wordBreak', 'Controls the word break rules used for Chinese/Japanese/Korean (CJK) text.'),
    })),
    wordSegmenterLocales: register(new WordSegmenterLocales()),
    wordSeparators: register(new EditorStringOption(136 /* EditorOption.wordSeparators */, 'wordSeparators', USUAL_WORD_SEPARATORS, {
        description: nls.localize('wordSeparators', 'Characters that will be used as word separators when doing word related navigations or operations.'),
    })),
    wordWrap: register(new EditorStringEnumOption(137 /* EditorOption.wordWrap */, 'wordWrap', 'off', ['off', 'on', 'wordWrapColumn', 'bounded'], {
        markdownEnumDescriptions: [
            nls.localize('wordWrap.off', 'Lines will never wrap.'),
            nls.localize('wordWrap.on', 'Lines will wrap at the viewport width.'),
            nls.localize({
                key: 'wordWrap.wordWrapColumn',
                comment: [
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.',
                ],
            }, 'Lines will wrap at `#editor.wordWrapColumn#`.'),
            nls.localize({
                key: 'wordWrap.bounded',
                comment: [
                    '- viewport means the edge of the visible window size.',
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.',
                ],
            }, 'Lines will wrap at the minimum of viewport and `#editor.wordWrapColumn#`.'),
        ],
        description: nls.localize({
            key: 'wordWrap',
            comment: [
                "- 'off', 'on', 'wordWrapColumn' and 'bounded' refer to values the setting can take and should not be localized.",
                '- `editor.wordWrapColumn` refers to a different setting and should not be localized.',
            ],
        }, 'Controls how lines should wrap.'),
    })),
    wordWrapBreakAfterCharacters: register(new EditorStringOption(138 /* EditorOption.wordWrapBreakAfterCharacters */, 'wordWrapBreakAfterCharacters', 
    // allow-any-unicode-next-line
    ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣')),
    wordWrapBreakBeforeCharacters: register(new EditorStringOption(139 /* EditorOption.wordWrapBreakBeforeCharacters */, 'wordWrapBreakBeforeCharacters', 
    // allow-any-unicode-next-line
    '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋')),
    wordWrapColumn: register(new EditorIntOption(140 /* EditorOption.wordWrapColumn */, 'wordWrapColumn', 80, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        markdownDescription: nls.localize({
            key: 'wordWrapColumn',
            comment: [
                '- `editor.wordWrap` refers to a different setting and should not be localized.',
                "- 'wordWrapColumn' and 'bounded' refer to values the different setting can take and should not be localized.",
            ],
        }, 'Controls the wrapping column of the editor when `#editor.wordWrap#` is `wordWrapColumn` or `bounded`.'),
    })),
    wordWrapOverride1: register(new EditorStringEnumOption(141 /* EditorOption.wordWrapOverride1 */, 'wordWrapOverride1', 'inherit', ['off', 'on', 'inherit'])),
    wordWrapOverride2: register(new EditorStringEnumOption(142 /* EditorOption.wordWrapOverride2 */, 'wordWrapOverride2', 'inherit', ['off', 'on', 'inherit'])),
    // Leave these at the end (because they have dependencies!)
    effectiveCursorStyle: register(new EffectiveCursorStyle()),
    editorClassName: register(new EditorClassName()),
    defaultColorDecorators: register(new EditorStringEnumOption(153 /* EditorOption.defaultColorDecorators */, 'defaultColorDecorators', 'auto', ['auto', 'always', 'never'], {
        enumDescriptions: [
            nls.localize('editor.defaultColorDecorators.auto', 'Show default color decorators only when no extension provides colors decorators.'),
            nls.localize('editor.defaultColorDecorators.always', 'Always show default color decorators.'),
            nls.localize('editor.defaultColorDecorators.never', 'Never show default color decorators.'),
        ],
        description: nls.localize('defaultColorDecorators', 'Controls whether inline color decorations should be shown using the default document color provider.'),
    })),
    pixelRatio: register(new EditorPixelRatio()),
    tabFocusMode: register(new EditorBooleanOption(150 /* EditorOption.tabFocusMode */, 'tabFocusMode', false, {
        markdownDescription: nls.localize('tabFocusMode', 'Controls whether the editor receives tabs or defers them to the workbench for navigation.'),
    })),
    layoutInfo: register(new EditorLayoutInfoComputer()),
    wrappingInfo: register(new EditorWrappingInfoComputer()),
    wrappingIndent: register(new WrappingIndentOption()),
    wrappingStrategy: register(new WrappingStrategy()),
    effectiveExperimentalEditContextEnabled: register(new EffectiveExperimentalEditContextEnabled()),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9jb25maWcvZWRpdG9yT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFBO0FBR3hELE9BQU8sS0FBSyxPQUFPLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxLQUFLLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUk1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM3RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBR3RDLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFBO0FBbUJqRTs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFrQix3QkFNakI7QUFORCxXQUFrQix3QkFBd0I7SUFDekMsdUVBQVEsQ0FBQTtJQUNSLHVFQUFRLENBQUE7SUFDUiwrRUFBWSxDQUFBO0lBQ1osK0VBQVksQ0FBQTtJQUNaLHVFQUFRLENBQUE7QUFDVCxDQUFDLEVBTmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFNekM7QUEydUJEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLENBQUMsQ0FBQTtBQXVKckMsWUFBWTtBQUVaOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQUVyQzs7T0FFRztJQUNILFlBQVksTUFBaUI7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUE7SUFDdEIsQ0FBQztJQUNNLFVBQVUsQ0FBQyxFQUFnQjtRQUNqQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUE7SUFD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