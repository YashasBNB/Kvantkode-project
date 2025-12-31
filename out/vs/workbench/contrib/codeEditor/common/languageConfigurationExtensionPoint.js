/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LanguageConfigurationFileHandler_1;
import * as nls from '../../../../nls.js';
import { parse, getNodeType } from '../../../../base/common/json.js';
import * as types from '../../../../base/common/types.js';
import { IndentAction, } from '../../../../editor/common/languages/languageConfiguration.js';
import { ILanguageConfigurationService } from '../../../../editor/common/languages/languageConfigurationRegistry.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { Extensions, } from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { getParseErrorMessage } from '../../../../base/common/jsonErrorMessages.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
function isStringArr(something) {
    if (!Array.isArray(something)) {
        return false;
    }
    for (let i = 0, len = something.length; i < len; i++) {
        if (typeof something[i] !== 'string') {
            return false;
        }
    }
    return true;
}
function isCharacterPair(something) {
    return isStringArr(something) && something.length === 2;
}
let LanguageConfigurationFileHandler = LanguageConfigurationFileHandler_1 = class LanguageConfigurationFileHandler extends Disposable {
    constructor(_languageService, _extensionResourceLoaderService, _extensionService, _languageConfigurationService) {
        super();
        this._languageService = _languageService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._extensionService = _extensionService;
        this._languageConfigurationService = _languageConfigurationService;
        /**
         * A map from language id to a hash computed from the config files locations.
         */
        this._done = new Map();
        this._register(this._languageService.onDidRequestBasicLanguageFeatures(async (languageIdentifier) => {
            // Modes can be instantiated before the extension points have finished registering
            this._extensionService.whenInstalledExtensionsRegistered().then(() => {
                this._loadConfigurationsForMode(languageIdentifier);
            });
        }));
        this._register(this._languageService.onDidChange(() => {
            // reload language configurations as necessary
            for (const [languageId] of this._done) {
                this._loadConfigurationsForMode(languageId);
            }
        }));
    }
    async _loadConfigurationsForMode(languageId) {
        const configurationFiles = this._languageService.getConfigurationFiles(languageId);
        const configurationHash = hash(configurationFiles.map((uri) => uri.toString()));
        if (this._done.get(languageId) === configurationHash) {
            return;
        }
        this._done.set(languageId, configurationHash);
        const configs = await Promise.all(configurationFiles.map((configFile) => this._readConfigFile(configFile)));
        for (const config of configs) {
            this._handleConfig(languageId, config);
        }
    }
    async _readConfigFile(configFileLocation) {
        try {
            const contents = await this._extensionResourceLoaderService.readExtensionResource(configFileLocation);
            const errors = [];
            let configuration = parse(contents, errors);
            if (errors.length) {
                console.error(nls.localize('parseErrors', 'Errors parsing {0}: {1}', configFileLocation.toString(), errors
                    .map((e) => `[${e.offset}, ${e.length}] ${getParseErrorMessage(e.error)}`)
                    .join('\n')));
            }
            if (getNodeType(configuration) !== 'object') {
                console.error(nls.localize('formatError', '{0}: Invalid format, JSON object expected.', configFileLocation.toString()));
                configuration = {};
            }
            return configuration;
        }
        catch (err) {
            console.error(err);
            return {};
        }
    }
    static _extractValidCommentRule(languageId, configuration) {
        const source = configuration.comments;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!types.isObject(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`comments\` to be an object.`);
            return undefined;
        }
        let result = undefined;
        if (typeof source.lineComment !== 'undefined') {
            if (typeof source.lineComment !== 'string') {
                console.warn(`[${languageId}]: language configuration: expected \`comments.lineComment\` to be a string.`);
            }
            else {
                result = result || {};
                result.lineComment = source.lineComment;
            }
        }
        if (typeof source.blockComment !== 'undefined') {
            if (!isCharacterPair(source.blockComment)) {
                console.warn(`[${languageId}]: language configuration: expected \`comments.blockComment\` to be an array of two strings.`);
            }
            else {
                result = result || {};
                result.blockComment = source.blockComment;
            }
        }
        return result;
    }
    static _extractValidBrackets(languageId, configuration) {
        const source = configuration.brackets;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!Array.isArray(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`brackets\` to be an array.`);
            return undefined;
        }
        let result = undefined;
        for (let i = 0, len = source.length; i < len; i++) {
            const pair = source[i];
            if (!isCharacterPair(pair)) {
                console.warn(`[${languageId}]: language configuration: expected \`brackets[${i}]\` to be an array of two strings.`);
                continue;
            }
            result = result || [];
            result.push(pair);
        }
        return result;
    }
    static _extractValidAutoClosingPairs(languageId, configuration) {
        const source = configuration.autoClosingPairs;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!Array.isArray(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs\` to be an array.`);
            return undefined;
        }
        let result = undefined;
        for (let i = 0, len = source.length; i < len; i++) {
            const pair = source[i];
            if (Array.isArray(pair)) {
                if (!isCharacterPair(pair)) {
                    console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs[${i}]\` to be an array of two strings or an object.`);
                    continue;
                }
                result = result || [];
                result.push({ open: pair[0], close: pair[1] });
            }
            else {
                if (!types.isObject(pair)) {
                    console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs[${i}]\` to be an array of two strings or an object.`);
                    continue;
                }
                if (typeof pair.open !== 'string') {
                    console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs[${i}].open\` to be a string.`);
                    continue;
                }
                if (typeof pair.close !== 'string') {
                    console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs[${i}].close\` to be a string.`);
                    continue;
                }
                if (typeof pair.notIn !== 'undefined') {
                    if (!isStringArr(pair.notIn)) {
                        console.warn(`[${languageId}]: language configuration: expected \`autoClosingPairs[${i}].notIn\` to be a string array.`);
                        continue;
                    }
                }
                result = result || [];
                result.push({ open: pair.open, close: pair.close, notIn: pair.notIn });
            }
        }
        return result;
    }
    static _extractValidSurroundingPairs(languageId, configuration) {
        const source = configuration.surroundingPairs;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!Array.isArray(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`surroundingPairs\` to be an array.`);
            return undefined;
        }
        let result = undefined;
        for (let i = 0, len = source.length; i < len; i++) {
            const pair = source[i];
            if (Array.isArray(pair)) {
                if (!isCharacterPair(pair)) {
                    console.warn(`[${languageId}]: language configuration: expected \`surroundingPairs[${i}]\` to be an array of two strings or an object.`);
                    continue;
                }
                result = result || [];
                result.push({ open: pair[0], close: pair[1] });
            }
            else {
                if (!types.isObject(pair)) {
                    console.warn(`[${languageId}]: language configuration: expected \`surroundingPairs[${i}]\` to be an array of two strings or an object.`);
                    continue;
                }
                if (typeof pair.open !== 'string') {
                    console.warn(`[${languageId}]: language configuration: expected \`surroundingPairs[${i}].open\` to be a string.`);
                    continue;
                }
                if (typeof pair.close !== 'string') {
                    console.warn(`[${languageId}]: language configuration: expected \`surroundingPairs[${i}].close\` to be a string.`);
                    continue;
                }
                result = result || [];
                result.push({ open: pair.open, close: pair.close });
            }
        }
        return result;
    }
    static _extractValidColorizedBracketPairs(languageId, configuration) {
        const source = configuration.colorizedBracketPairs;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!Array.isArray(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`colorizedBracketPairs\` to be an array.`);
            return undefined;
        }
        const result = [];
        for (let i = 0, len = source.length; i < len; i++) {
            const pair = source[i];
            if (!isCharacterPair(pair)) {
                console.warn(`[${languageId}]: language configuration: expected \`colorizedBracketPairs[${i}]\` to be an array of two strings.`);
                continue;
            }
            result.push([pair[0], pair[1]]);
        }
        return result;
    }
    static _extractValidOnEnterRules(languageId, configuration) {
        const source = configuration.onEnterRules;
        if (typeof source === 'undefined') {
            return undefined;
        }
        if (!Array.isArray(source)) {
            console.warn(`[${languageId}]: language configuration: expected \`onEnterRules\` to be an array.`);
            return undefined;
        }
        let result = undefined;
        for (let i = 0, len = source.length; i < len; i++) {
            const onEnterRule = source[i];
            if (!types.isObject(onEnterRule)) {
                console.warn(`[${languageId}]: language configuration: expected \`onEnterRules[${i}]\` to be an object.`);
                continue;
            }
            if (!types.isObject(onEnterRule.action)) {
                console.warn(`[${languageId}]: language configuration: expected \`onEnterRules[${i}].action\` to be an object.`);
                continue;
            }
            let indentAction;
            if (onEnterRule.action.indent === 'none') {
                indentAction = IndentAction.None;
            }
            else if (onEnterRule.action.indent === 'indent') {
                indentAction = IndentAction.Indent;
            }
            else if (onEnterRule.action.indent === 'indentOutdent') {
                indentAction = IndentAction.IndentOutdent;
            }
            else if (onEnterRule.action.indent === 'outdent') {
                indentAction = IndentAction.Outdent;
            }
            else {
                console.warn(`[${languageId}]: language configuration: expected \`onEnterRules[${i}].action.indent\` to be 'none', 'indent', 'indentOutdent' or 'outdent'.`);
                continue;
            }
            const action = { indentAction };
            if (onEnterRule.action.appendText) {
                if (typeof onEnterRule.action.appendText === 'string') {
                    action.appendText = onEnterRule.action.appendText;
                }
                else {
                    console.warn(`[${languageId}]: language configuration: expected \`onEnterRules[${i}].action.appendText\` to be undefined or a string.`);
                }
            }
            if (onEnterRule.action.removeText) {
                if (typeof onEnterRule.action.removeText === 'number') {
                    action.removeText = onEnterRule.action.removeText;
                }
                else {
                    console.warn(`[${languageId}]: language configuration: expected \`onEnterRules[${i}].action.removeText\` to be undefined or a number.`);
                }
            }
            const beforeText = this._parseRegex(languageId, `onEnterRules[${i}].beforeText`, onEnterRule.beforeText);
            if (!beforeText) {
                continue;
            }
            const resultingOnEnterRule = { beforeText, action };
            if (onEnterRule.afterText) {
                const afterText = this._parseRegex(languageId, `onEnterRules[${i}].afterText`, onEnterRule.afterText);
                if (afterText) {
                    resultingOnEnterRule.afterText = afterText;
                }
            }
            if (onEnterRule.previousLineText) {
                const previousLineText = this._parseRegex(languageId, `onEnterRules[${i}].previousLineText`, onEnterRule.previousLineText);
                if (previousLineText) {
                    resultingOnEnterRule.previousLineText = previousLineText;
                }
            }
            result = result || [];
            result.push(resultingOnEnterRule);
        }
        return result;
    }
    static extractValidConfig(languageId, configuration) {
        const comments = this._extractValidCommentRule(languageId, configuration);
        const brackets = this._extractValidBrackets(languageId, configuration);
        const autoClosingPairs = this._extractValidAutoClosingPairs(languageId, configuration);
        const surroundingPairs = this._extractValidSurroundingPairs(languageId, configuration);
        const colorizedBracketPairs = this._extractValidColorizedBracketPairs(languageId, configuration);
        const autoCloseBefore = typeof configuration.autoCloseBefore === 'string' ? configuration.autoCloseBefore : undefined;
        const wordPattern = configuration.wordPattern
            ? this._parseRegex(languageId, `wordPattern`, configuration.wordPattern)
            : undefined;
        const indentationRules = configuration.indentationRules
            ? this._mapIndentationRules(languageId, configuration.indentationRules)
            : undefined;
        let folding = undefined;
        if (configuration.folding) {
            const rawMarkers = configuration.folding.markers;
            const startMarker = rawMarkers && rawMarkers.start
                ? this._parseRegex(languageId, `folding.markers.start`, rawMarkers.start)
                : undefined;
            const endMarker = rawMarkers && rawMarkers.end
                ? this._parseRegex(languageId, `folding.markers.end`, rawMarkers.end)
                : undefined;
            const markers = startMarker && endMarker ? { start: startMarker, end: endMarker } : undefined;
            folding = {
                offSide: configuration.folding.offSide,
                markers,
            };
        }
        const onEnterRules = this._extractValidOnEnterRules(languageId, configuration);
        const richEditConfig = {
            comments,
            brackets,
            wordPattern,
            indentationRules,
            onEnterRules,
            autoClosingPairs,
            surroundingPairs,
            colorizedBracketPairs,
            autoCloseBefore,
            folding,
            __electricCharacterSupport: undefined,
        };
        return richEditConfig;
    }
    _handleConfig(languageId, configuration) {
        const richEditConfig = LanguageConfigurationFileHandler_1.extractValidConfig(languageId, configuration);
        this._languageConfigurationService.register(languageId, richEditConfig, 50);
    }
    static _parseRegex(languageId, confPath, value) {
        if (typeof value === 'string') {
            try {
                return new RegExp(value, '');
            }
            catch (err) {
                console.warn(`[${languageId}]: Invalid regular expression in \`${confPath}\`: `, err);
                return undefined;
            }
        }
        if (types.isObject(value)) {
            if (typeof value.pattern !== 'string') {
                console.warn(`[${languageId}]: language configuration: expected \`${confPath}.pattern\` to be a string.`);
                return undefined;
            }
            if (typeof value.flags !== 'undefined' && typeof value.flags !== 'string') {
                console.warn(`[${languageId}]: language configuration: expected \`${confPath}.flags\` to be a string.`);
                return undefined;
            }
            try {
                return new RegExp(value.pattern, value.flags);
            }
            catch (err) {
                console.warn(`[${languageId}]: Invalid regular expression in \`${confPath}\`: `, err);
                return undefined;
            }
        }
        console.warn(`[${languageId}]: language configuration: expected \`${confPath}\` to be a string or an object.`);
        return undefined;
    }
    static _mapIndentationRules(languageId, indentationRules) {
        const increaseIndentPattern = this._parseRegex(languageId, `indentationRules.increaseIndentPattern`, indentationRules.increaseIndentPattern);
        if (!increaseIndentPattern) {
            return undefined;
        }
        const decreaseIndentPattern = this._parseRegex(languageId, `indentationRules.decreaseIndentPattern`, indentationRules.decreaseIndentPattern);
        if (!decreaseIndentPattern) {
            return undefined;
        }
        const result = {
            increaseIndentPattern: increaseIndentPattern,
            decreaseIndentPattern: decreaseIndentPattern,
        };
        if (indentationRules.indentNextLinePattern) {
            result.indentNextLinePattern = this._parseRegex(languageId, `indentationRules.indentNextLinePattern`, indentationRules.indentNextLinePattern);
        }
        if (indentationRules.unIndentedLinePattern) {
            result.unIndentedLinePattern = this._parseRegex(languageId, `indentationRules.unIndentedLinePattern`, indentationRules.unIndentedLinePattern);
        }
        return result;
    }
};
LanguageConfigurationFileHandler = LanguageConfigurationFileHandler_1 = __decorate([
    __param(0, ILanguageService),
    __param(1, IExtensionResourceLoaderService),
    __param(2, IExtensionService),
    __param(3, ILanguageConfigurationService)
], LanguageConfigurationFileHandler);
export { LanguageConfigurationFileHandler };
const schemaId = 'vscode://schemas/language-configuration';
const schema = {
    allowComments: true,
    allowTrailingCommas: true,
    default: {
        comments: {
            blockComment: ['/*', '*/'],
            lineComment: '//',
        },
        brackets: [
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
        ],
        autoClosingPairs: [
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
        ],
        surroundingPairs: [
            ['(', ')'],
            ['[', ']'],
            ['{', '}'],
        ],
    },
    definitions: {
        openBracket: {
            type: 'string',
            description: nls.localize('schema.openBracket', 'The opening bracket character or string sequence.'),
        },
        closeBracket: {
            type: 'string',
            description: nls.localize('schema.closeBracket', 'The closing bracket character or string sequence.'),
        },
        bracketPair: {
            type: 'array',
            items: [
                {
                    $ref: '#/definitions/openBracket',
                },
                {
                    $ref: '#/definitions/closeBracket',
                },
            ],
        },
    },
    properties: {
        comments: {
            default: {
                blockComment: ['/*', '*/'],
                lineComment: '//',
            },
            description: nls.localize('schema.comments', 'Defines the comment symbols'),
            type: 'object',
            properties: {
                blockComment: {
                    type: 'array',
                    description: nls.localize('schema.blockComments', 'Defines how block comments are marked.'),
                    items: [
                        {
                            type: 'string',
                            description: nls.localize('schema.blockComment.begin', 'The character sequence that starts a block comment.'),
                        },
                        {
                            type: 'string',
                            description: nls.localize('schema.blockComment.end', 'The character sequence that ends a block comment.'),
                        },
                    ],
                },
                lineComment: {
                    type: 'string',
                    description: nls.localize('schema.lineComment', 'The character sequence that starts a line comment.'),
                },
            },
        },
        brackets: {
            default: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            markdownDescription: nls.localize('schema.brackets', 'Defines the bracket symbols that increase or decrease the indentation. When bracket pair colorization is enabled and {0} is not defined, this also defines the bracket pairs that are colorized by their nesting level.', '\`colorizedBracketPairs\`'),
            type: 'array',
            items: {
                $ref: '#/definitions/bracketPair',
            },
        },
        colorizedBracketPairs: {
            default: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            markdownDescription: nls.localize('schema.colorizedBracketPairs', 'Defines the bracket pairs that are colorized by their nesting level if bracket pair colorization is enabled. Any brackets included here that are not included in {0} will be automatically included in {0}.', '\`brackets\`'),
            type: 'array',
            items: {
                $ref: '#/definitions/bracketPair',
            },
        },
        autoClosingPairs: {
            default: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            description: nls.localize('schema.autoClosingPairs', 'Defines the bracket pairs. When a opening bracket is entered, the closing bracket is inserted automatically.'),
            type: 'array',
            items: {
                oneOf: [
                    {
                        $ref: '#/definitions/bracketPair',
                    },
                    {
                        type: 'object',
                        properties: {
                            open: {
                                $ref: '#/definitions/openBracket',
                            },
                            close: {
                                $ref: '#/definitions/closeBracket',
                            },
                            notIn: {
                                type: 'array',
                                description: nls.localize('schema.autoClosingPairs.notIn', 'Defines a list of scopes where the auto pairs are disabled.'),
                                items: {
                                    enum: ['string', 'comment'],
                                },
                            },
                        },
                    },
                ],
            },
        },
        autoCloseBefore: {
            default: ';:.,=}])> \n\t',
            description: nls.localize('schema.autoCloseBefore', "Defines what characters must be after the cursor in order for bracket or quote autoclosing to occur when using the 'languageDefined' autoclosing setting. This is typically the set of characters which can not start an expression."),
            type: 'string',
        },
        surroundingPairs: {
            default: [
                ['(', ')'],
                ['[', ']'],
                ['{', '}'],
            ],
            description: nls.localize('schema.surroundingPairs', 'Defines the bracket pairs that can be used to surround a selected string.'),
            type: 'array',
            items: {
                oneOf: [
                    {
                        $ref: '#/definitions/bracketPair',
                    },
                    {
                        type: 'object',
                        properties: {
                            open: {
                                $ref: '#/definitions/openBracket',
                            },
                            close: {
                                $ref: '#/definitions/closeBracket',
                            },
                        },
                    },
                ],
            },
        },
        wordPattern: {
            default: '',
            description: nls.localize('schema.wordPattern', 'Defines what is considered to be a word in the programming language.'),
            type: ['string', 'object'],
            properties: {
                pattern: {
                    type: 'string',
                    description: nls.localize('schema.wordPattern.pattern', 'The RegExp pattern used to match words.'),
                    default: '',
                },
                flags: {
                    type: 'string',
                    description: nls.localize('schema.wordPattern.flags', 'The RegExp flags used to match words.'),
                    default: 'g',
                    pattern: '^([gimuy]+)$',
                    patternErrorMessage: nls.localize('schema.wordPattern.flags.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                },
            },
        },
        indentationRules: {
            default: {
                increaseIndentPattern: '',
                decreaseIndentPattern: '',
            },
            description: nls.localize('schema.indentationRules', "The language's indentation settings."),
            type: 'object',
            properties: {
                increaseIndentPattern: {
                    type: ['string', 'object'],
                    description: nls.localize('schema.indentationRules.increaseIndentPattern', 'If a line matches this pattern, then all the lines after it should be indented once (until another rule matches).'),
                    properties: {
                        pattern: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.increaseIndentPattern.pattern', 'The RegExp pattern for increaseIndentPattern.'),
                            default: '',
                        },
                        flags: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.increaseIndentPattern.flags', 'The RegExp flags for increaseIndentPattern.'),
                            default: '',
                            pattern: '^([gimuy]+)$',
                            patternErrorMessage: nls.localize('schema.indentationRules.increaseIndentPattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                        },
                    },
                },
                decreaseIndentPattern: {
                    type: ['string', 'object'],
                    description: nls.localize('schema.indentationRules.decreaseIndentPattern', 'If a line matches this pattern, then all the lines after it should be unindented once (until another rule matches).'),
                    properties: {
                        pattern: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.decreaseIndentPattern.pattern', 'The RegExp pattern for decreaseIndentPattern.'),
                            default: '',
                        },
                        flags: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.decreaseIndentPattern.flags', 'The RegExp flags for decreaseIndentPattern.'),
                            default: '',
                            pattern: '^([gimuy]+)$',
                            patternErrorMessage: nls.localize('schema.indentationRules.decreaseIndentPattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                        },
                    },
                },
                indentNextLinePattern: {
                    type: ['string', 'object'],
                    description: nls.localize('schema.indentationRules.indentNextLinePattern', 'If a line matches this pattern, then **only the next line** after it should be indented once.'),
                    properties: {
                        pattern: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.indentNextLinePattern.pattern', 'The RegExp pattern for indentNextLinePattern.'),
                            default: '',
                        },
                        flags: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.indentNextLinePattern.flags', 'The RegExp flags for indentNextLinePattern.'),
                            default: '',
                            pattern: '^([gimuy]+)$',
                            patternErrorMessage: nls.localize('schema.indentationRules.indentNextLinePattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                        },
                    },
                },
                unIndentedLinePattern: {
                    type: ['string', 'object'],
                    description: nls.localize('schema.indentationRules.unIndentedLinePattern', 'If a line matches this pattern, then its indentation should not be changed and it should not be evaluated against the other rules.'),
                    properties: {
                        pattern: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.unIndentedLinePattern.pattern', 'The RegExp pattern for unIndentedLinePattern.'),
                            default: '',
                        },
                        flags: {
                            type: 'string',
                            description: nls.localize('schema.indentationRules.unIndentedLinePattern.flags', 'The RegExp flags for unIndentedLinePattern.'),
                            default: '',
                            pattern: '^([gimuy]+)$',
                            patternErrorMessage: nls.localize('schema.indentationRules.unIndentedLinePattern.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                        },
                    },
                },
            },
        },
        folding: {
            type: 'object',
            description: nls.localize('schema.folding', "The language's folding settings."),
            properties: {
                offSide: {
                    type: 'boolean',
                    description: nls.localize('schema.folding.offSide', 'A language adheres to the off-side rule if blocks in that language are expressed by their indentation. If set, empty lines belong to the subsequent block.'),
                },
                markers: {
                    type: 'object',
                    description: nls.localize('schema.folding.markers', "Language specific folding markers such as '#region' and '#endregion'. The start and end regexes will be tested against the contents of all lines and must be designed efficiently"),
                    properties: {
                        start: {
                            type: 'string',
                            description: nls.localize('schema.folding.markers.start', "The RegExp pattern for the start marker. The regexp must start with '^'."),
                        },
                        end: {
                            type: 'string',
                            description: nls.localize('schema.folding.markers.end', "The RegExp pattern for the end marker. The regexp must start with '^'."),
                        },
                    },
                },
            },
        },
        onEnterRules: {
            type: 'array',
            description: nls.localize('schema.onEnterRules', "The language's rules to be evaluated when pressing Enter."),
            items: {
                type: 'object',
                description: nls.localize('schema.onEnterRules', "The language's rules to be evaluated when pressing Enter."),
                required: ['beforeText', 'action'],
                properties: {
                    beforeText: {
                        type: ['string', 'object'],
                        description: nls.localize('schema.onEnterRules.beforeText', 'This rule will only execute if the text before the cursor matches this regular expression.'),
                        properties: {
                            pattern: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.beforeText.pattern', 'The RegExp pattern for beforeText.'),
                                default: '',
                            },
                            flags: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.beforeText.flags', 'The RegExp flags for beforeText.'),
                                default: '',
                                pattern: '^([gimuy]+)$',
                                patternErrorMessage: nls.localize('schema.onEnterRules.beforeText.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                            },
                        },
                    },
                    afterText: {
                        type: ['string', 'object'],
                        description: nls.localize('schema.onEnterRules.afterText', 'This rule will only execute if the text after the cursor matches this regular expression.'),
                        properties: {
                            pattern: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.afterText.pattern', 'The RegExp pattern for afterText.'),
                                default: '',
                            },
                            flags: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.afterText.flags', 'The RegExp flags for afterText.'),
                                default: '',
                                pattern: '^([gimuy]+)$',
                                patternErrorMessage: nls.localize('schema.onEnterRules.afterText.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                            },
                        },
                    },
                    previousLineText: {
                        type: ['string', 'object'],
                        description: nls.localize('schema.onEnterRules.previousLineText', 'This rule will only execute if the text above the line matches this regular expression.'),
                        properties: {
                            pattern: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.previousLineText.pattern', 'The RegExp pattern for previousLineText.'),
                                default: '',
                            },
                            flags: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.previousLineText.flags', 'The RegExp flags for previousLineText.'),
                                default: '',
                                pattern: '^([gimuy]+)$',
                                patternErrorMessage: nls.localize('schema.onEnterRules.previousLineText.errorMessage', 'Must match the pattern `/^([gimuy]+)$/`.'),
                            },
                        },
                    },
                    action: {
                        type: ['string', 'object'],
                        description: nls.localize('schema.onEnterRules.action', 'The action to execute.'),
                        required: ['indent'],
                        default: { indent: 'indent' },
                        properties: {
                            indent: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.action.indent', 'Describe what to do with the indentation'),
                                default: 'indent',
                                enum: ['none', 'indent', 'indentOutdent', 'outdent'],
                                markdownEnumDescriptions: [
                                    nls.localize('schema.onEnterRules.action.indent.none', "Insert new line and copy the previous line's indentation."),
                                    nls.localize('schema.onEnterRules.action.indent.indent', "Insert new line and indent once (relative to the previous line's indentation)."),
                                    nls.localize('schema.onEnterRules.action.indent.indentOutdent', 'Insert two new lines:\n - the first one indented which will hold the cursor\n - the second one at the same indentation level'),
                                    nls.localize('schema.onEnterRules.action.indent.outdent', "Insert new line and outdent once (relative to the previous line's indentation)."),
                                ],
                            },
                            appendText: {
                                type: 'string',
                                description: nls.localize('schema.onEnterRules.action.appendText', 'Describes text to be appended after the new line and after the indentation.'),
                                default: '',
                            },
                            removeText: {
                                type: 'number',
                                description: nls.localize('schema.onEnterRules.action.removeText', "Describes the number of characters to remove from the new line's indentation."),
                                default: 0,
                            },
                        },
                    },
                },
            },
        },
    },
};
const schemaRegistry = Registry.as(Extensions.JSONContribution);
schemaRegistry.registerSchema(schemaId, schema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VDb25maWd1cmF0aW9uRXh0ZW5zaW9uUG9pbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2NvbW1vbi9sYW5ndWFnZUNvbmZpZ3VyYXRpb25FeHRlbnNpb25Qb2ludC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQWMsS0FBSyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWhGLE9BQU8sS0FBSyxLQUFLLE1BQU0sa0NBQWtDLENBQUE7QUFFekQsT0FBTyxFQVNOLFlBQVksR0FHWixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3BILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixVQUFVLEdBRVYsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbkYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sZ0ZBQWdGLENBQUE7QUFDaEksT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWlEakUsU0FBUyxXQUFXLENBQUMsU0FBMEI7SUFDOUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxD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