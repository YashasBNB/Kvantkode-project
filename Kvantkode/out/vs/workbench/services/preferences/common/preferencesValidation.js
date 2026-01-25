/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Color } from '../../../../base/common/color.js';
import { isObject, isUndefinedOrNull, isString, isStringArray, } from '../../../../base/common/types.js';
function canBeType(propTypes, ...types) {
    return types.some((t) => propTypes.includes(t));
}
function isNullOrEmpty(value) {
    return value === '' || isUndefinedOrNull(value);
}
export function createValidator(prop) {
    const type = Array.isArray(prop.type) ? prop.type : [prop.type];
    const isNullable = canBeType(type, 'null');
    const isNumeric = (canBeType(type, 'number') || canBeType(type, 'integer')) &&
        (type.length === 1 || (type.length === 2 && isNullable));
    const numericValidations = getNumericValidators(prop);
    const stringValidations = getStringValidators(prop);
    const arrayValidator = getArrayValidator(prop);
    const objectValidator = getObjectValidator(prop);
    return (value) => {
        if (isNullable && isNullOrEmpty(value)) {
            return '';
        }
        const errors = [];
        if (arrayValidator) {
            const err = arrayValidator(value);
            if (err) {
                errors.push(err);
            }
        }
        if (objectValidator) {
            const err = objectValidator(value);
            if (err) {
                errors.push(err);
            }
        }
        if (prop.type === 'boolean' && value !== true && value !== false) {
            errors.push(nls.localize('validations.booleanIncorrectType', 'Incorrect type. Expected "boolean".'));
        }
        if (isNumeric) {
            if (isNullOrEmpty(value) ||
                typeof value === 'boolean' ||
                Array.isArray(value) ||
                isNaN(+value)) {
                errors.push(nls.localize('validations.expectedNumeric', 'Value must be a number.'));
            }
            else {
                errors.push(...numericValidations
                    .filter((validator) => !validator.isValid(+value))
                    .map((validator) => validator.message));
            }
        }
        if (prop.type === 'string') {
            if (prop.enum && !isStringArray(prop.enum)) {
                errors.push(nls.localize('validations.stringIncorrectEnumOptions', 'The enum options should be strings, but there is a non-string option. Please file an issue with the extension author.'));
            }
            else if (!isString(value)) {
                errors.push(nls.localize('validations.stringIncorrectType', 'Incorrect type. Expected "string".'));
            }
            else {
                errors.push(...stringValidations
                    .filter((validator) => !validator.isValid(value))
                    .map((validator) => validator.message));
            }
        }
        if (errors.length) {
            return prop.errorMessage ? [prop.errorMessage, ...errors].join(' ') : errors.join(' ');
        }
        return '';
    };
}
/**
 * Returns an error string if the value is invalid and can't be displayed in the settings UI for the given type.
 */
export function getInvalidTypeError(value, type) {
    if (typeof type === 'undefined') {
        return;
    }
    const typeArr = Array.isArray(type) ? type : [type];
    if (!typeArr.some((_type) => valueValidatesAsType(value, _type))) {
        return nls.localize('invalidTypeError', 'Setting has an invalid type, expected {0}. Fix in JSON.', JSON.stringify(type));
    }
    return;
}
function valueValidatesAsType(value, type) {
    const valueType = typeof value;
    if (type === 'boolean') {
        return valueType === 'boolean';
    }
    else if (type === 'object') {
        return value && !Array.isArray(value) && valueType === 'object';
    }
    else if (type === 'null') {
        return value === null;
    }
    else if (type === 'array') {
        return Array.isArray(value);
    }
    else if (type === 'string') {
        return valueType === 'string';
    }
    else if (type === 'number' || type === 'integer') {
        return valueType === 'number';
    }
    return true;
}
function toRegExp(pattern) {
    try {
        // The u flag allows support for better Unicode matching,
        // but deprecates some patterns such as [\s-9]
        // Ref https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Character_class#description
        return new RegExp(pattern, 'u');
    }
    catch (e) {
        try {
            return new RegExp(pattern);
        }
        catch (e) {
            // If the pattern can't be parsed even without the 'u' flag,
            // just log the error to avoid rendering the entire Settings editor blank.
            // Ref https://github.com/microsoft/vscode/issues/195054
            console.error(nls.localize('regexParsingError', 'Error parsing the following regex both with and without the u flag:'), pattern);
            return /.*/;
        }
    }
}
function getStringValidators(prop) {
    const uriRegex = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    let patternRegex;
    if (typeof prop.pattern === 'string') {
        patternRegex = toRegExp(prop.pattern);
    }
    return [
        {
            enabled: prop.maxLength !== undefined,
            isValid: (value) => value.length <= prop.maxLength,
            message: nls.localize('validations.maxLength', 'Value must be {0} or fewer characters long.', prop.maxLength),
        },
        {
            enabled: prop.minLength !== undefined,
            isValid: (value) => value.length >= prop.minLength,
            message: nls.localize('validations.minLength', 'Value must be {0} or more characters long.', prop.minLength),
        },
        {
            enabled: patternRegex !== undefined,
            isValid: (value) => patternRegex.test(value),
            message: prop.patternErrorMessage ||
                nls.localize('validations.regex', 'Value must match regex `{0}`.', prop.pattern),
        },
        {
            enabled: prop.format === 'color-hex',
            isValid: (value) => Color.Format.CSS.parseHex(value),
            message: nls.localize('validations.colorFormat', 'Invalid color format. Use #RGB, #RGBA, #RRGGBB or #RRGGBBAA.'),
        },
        {
            enabled: prop.format === 'uri' || prop.format === 'uri-reference',
            isValid: (value) => !!value.length,
            message: nls.localize('validations.uriEmpty', 'URI expected.'),
        },
        {
            enabled: prop.format === 'uri' || prop.format === 'uri-reference',
            isValid: (value) => uriRegex.test(value),
            message: nls.localize('validations.uriMissing', 'URI is expected.'),
        },
        {
            enabled: prop.format === 'uri',
            isValid: (value) => {
                const matches = value.match(uriRegex);
                return !!(matches && matches[2]);
            },
            message: nls.localize('validations.uriSchemeMissing', 'URI with a scheme is expected.'),
        },
        {
            enabled: prop.enum !== undefined,
            isValid: (value) => {
                return prop.enum.includes(value);
            },
            message: nls.localize('validations.invalidStringEnumValue', 'Value is not accepted. Valid values: {0}.', prop.enum ? prop.enum.map((key) => `"${key}"`).join(', ') : '[]'),
        },
    ].filter((validation) => validation.enabled);
}
function getNumericValidators(prop) {
    const type = Array.isArray(prop.type) ? prop.type : [prop.type];
    const isNullable = canBeType(type, 'null');
    const isIntegral = canBeType(type, 'integer') && (type.length === 1 || (type.length === 2 && isNullable));
    const isNumeric = canBeType(type, 'number', 'integer') && (type.length === 1 || (type.length === 2 && isNullable));
    if (!isNumeric) {
        return [];
    }
    let exclusiveMax;
    let exclusiveMin;
    if (typeof prop.exclusiveMaximum === 'boolean') {
        exclusiveMax = prop.exclusiveMaximum ? prop.maximum : undefined;
    }
    else {
        exclusiveMax = prop.exclusiveMaximum;
    }
    if (typeof prop.exclusiveMinimum === 'boolean') {
        exclusiveMin = prop.exclusiveMinimum ? prop.minimum : undefined;
    }
    else {
        exclusiveMin = prop.exclusiveMinimum;
    }
    return [
        {
            enabled: exclusiveMax !== undefined && (prop.maximum === undefined || exclusiveMax <= prop.maximum),
            isValid: (value) => value < exclusiveMax,
            message: nls.localize('validations.exclusiveMax', 'Value must be strictly less than {0}.', exclusiveMax),
        },
        {
            enabled: exclusiveMin !== undefined && (prop.minimum === undefined || exclusiveMin >= prop.minimum),
            isValid: (value) => value > exclusiveMin,
            message: nls.localize('validations.exclusiveMin', 'Value must be strictly greater than {0}.', exclusiveMin),
        },
        {
            enabled: prop.maximum !== undefined && (exclusiveMax === undefined || exclusiveMax > prop.maximum),
            isValid: (value) => value <= prop.maximum,
            message: nls.localize('validations.max', 'Value must be less than or equal to {0}.', prop.maximum),
        },
        {
            enabled: prop.minimum !== undefined && (exclusiveMin === undefined || exclusiveMin < prop.minimum),
            isValid: (value) => value >= prop.minimum,
            message: nls.localize('validations.min', 'Value must be greater than or equal to {0}.', prop.minimum),
        },
        {
            enabled: prop.multipleOf !== undefined,
            isValid: (value) => value % prop.multipleOf === 0,
            message: nls.localize('validations.multipleOf', 'Value must be a multiple of {0}.', prop.multipleOf),
        },
        {
            enabled: isIntegral,
            isValid: (value) => value % 1 === 0,
            message: nls.localize('validations.expectedInteger', 'Value must be an integer.'),
        },
    ].filter((validation) => validation.enabled);
}
function getArrayValidator(prop) {
    if (prop.type === 'array' && prop.items && !Array.isArray(prop.items)) {
        const propItems = prop.items;
        if (propItems && !Array.isArray(propItems.type)) {
            const withQuotes = (s) => `'` + s + `'`;
            return (value) => {
                if (!value) {
                    return null;
                }
                let message = '';
                if (!Array.isArray(value)) {
                    message += nls.localize('validations.arrayIncorrectType', 'Incorrect type. Expected an array.');
                    message += '\n';
                    return message;
                }
                const arrayValue = value;
                if (prop.uniqueItems) {
                    if (new Set(arrayValue).size < arrayValue.length) {
                        message += nls.localize('validations.stringArrayUniqueItems', 'Array has duplicate items');
                        message += '\n';
                    }
                }
                if (prop.minItems && arrayValue.length < prop.minItems) {
                    message += nls.localize('validations.stringArrayMinItem', 'Array must have at least {0} items', prop.minItems);
                    message += '\n';
                }
                if (prop.maxItems && arrayValue.length > prop.maxItems) {
                    message += nls.localize('validations.stringArrayMaxItem', 'Array must have at most {0} items', prop.maxItems);
                    message += '\n';
                }
                if (propItems.type === 'string') {
                    if (!isStringArray(arrayValue)) {
                        message += nls.localize('validations.stringArrayIncorrectType', 'Incorrect type. Expected a string array.');
                        message += '\n';
                        return message;
                    }
                    if (typeof propItems.pattern === 'string') {
                        const patternRegex = toRegExp(propItems.pattern);
                        arrayValue.forEach((v) => {
                            if (!patternRegex.test(v)) {
                                message +=
                                    propItems.patternErrorMessage ||
                                        nls.localize('validations.stringArrayItemPattern', 'Value {0} must match regex {1}.', withQuotes(v), withQuotes(propItems.pattern));
                            }
                        });
                    }
                    const propItemsEnum = propItems.enum;
                    if (propItemsEnum) {
                        arrayValue.forEach((v) => {
                            if (propItemsEnum.indexOf(v) === -1) {
                                message += nls.localize('validations.stringArrayItemEnum', 'Value {0} is not one of {1}', withQuotes(v), '[' + propItemsEnum.map(withQuotes).join(', ') + ']');
                                message += '\n';
                            }
                        });
                    }
                }
                else if (propItems.type === 'integer' || propItems.type === 'number') {
                    arrayValue.forEach((v) => {
                        const errorMessage = getErrorsForSchema(propItems, v);
                        if (errorMessage) {
                            message += `${v}: ${errorMessage}\n`;
                        }
                    });
                }
                return message;
            };
        }
    }
    return null;
}
function getObjectValidator(prop) {
    if (prop.type === 'object') {
        const { properties, patternProperties, additionalProperties } = prop;
        return (value) => {
            if (!value) {
                return null;
            }
            const errors = [];
            if (!isObject(value)) {
                errors.push(nls.localize('validations.objectIncorrectType', 'Incorrect type. Expected an object.'));
            }
            else {
                Object.keys(value).forEach((key) => {
                    const data = value[key];
                    if (properties && key in properties) {
                        const errorMessage = getErrorsForSchema(properties[key], data);
                        if (errorMessage) {
                            errors.push(`${key}: ${errorMessage}\n`);
                        }
                        return;
                    }
                    if (patternProperties) {
                        for (const pattern in patternProperties) {
                            if (RegExp(pattern).test(key)) {
                                const errorMessage = getErrorsForSchema(patternProperties[pattern], data);
                                if (errorMessage) {
                                    errors.push(`${key}: ${errorMessage}\n`);
                                }
                                return;
                            }
                        }
                    }
                    if (additionalProperties === false) {
                        errors.push(nls.localize('validations.objectPattern', 'Property {0} is not allowed.\n', key));
                    }
                    else if (typeof additionalProperties === 'object') {
                        const errorMessage = getErrorsForSchema(additionalProperties, data);
                        if (errorMessage) {
                            errors.push(`${key}: ${errorMessage}\n`);
                        }
                    }
                });
            }
            if (errors.length) {
                return prop.errorMessage ? [prop.errorMessage, ...errors].join(' ') : errors.join(' ');
            }
            return '';
        };
    }
    return null;
}
function getErrorsForSchema(propertySchema, data) {
    const validator = createValidator(propertySchema);
    const errorMessage = validator(data);
    return errorMessage;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNWYWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvY29tbW9uL3ByZWZlcmVuY2VzVmFsaWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sUUFBUSxFQUNSLGlCQUFpQixFQUNqQixRQUFRLEVBQ1IsYUFBYSxHQUNiLE1BQU0sa0NBQWtDLENBQUE7QUFLekMsU0FBUyxTQUFTLENBQUMsU0FBaUMsRUFBRSxHQUFHLEtBQXVCO0lBQy9FLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ2hELENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxLQUFjO0lBQ3BDLE9BQU8sS0FBSyxLQUFLLEVBQUUsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNoRCxDQUFDO0FBRUQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxJQUFrQztJQUNqRSxNQUFNLElBQUksR0FBMkIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3ZGLE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDMUMsTUFBTSxTQUFTLEdBQ2QsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFF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