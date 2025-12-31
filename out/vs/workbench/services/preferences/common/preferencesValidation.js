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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNWYWxpZGF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc1ZhbGlkYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUNOLFFBQVEsRUFDUixpQkFBaUIsRUFDakIsUUFBUSxFQUNSLGFBQWEsR0FDYixNQUFNLGtDQUFrQyxDQUFBO0FBS3pDLFNBQVMsU0FBUyxDQUFDLFNBQWlDLEVBQUUsR0FBRyxLQUF1QjtJQUMvRSxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUNoRCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsS0FBYztJQUNwQyxPQUFPLEtBQUssS0FBSyxFQUFFLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDaEQsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsSUFBa0M7SUFDakUsTUFBTSxJQUFJLEdBQTJCLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN2RixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzFDLE1BQU0sU0FBUyxHQUNkLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFR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