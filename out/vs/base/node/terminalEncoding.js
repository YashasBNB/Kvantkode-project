/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * This code is also used by standalone cli's. Avoid adding dependencies to keep the size of the cli small.
 */
import { exec } from 'child_process';
import { isWindows } from '../common/platform.js';
const windowsTerminalEncodings = {
    '437': 'cp437', // United States
    '850': 'cp850', // Multilingual(Latin I)
    '852': 'cp852', // Slavic(Latin II)
    '855': 'cp855', // Cyrillic(Russian)
    '857': 'cp857', // Turkish
    '860': 'cp860', // Portuguese
    '861': 'cp861', // Icelandic
    '863': 'cp863', // Canadian - French
    '865': 'cp865', // Nordic
    '866': 'cp866', // Russian
    '869': 'cp869', // Modern Greek
    '936': 'cp936', // Simplified Chinese
    '1252': 'cp1252', // West European Latin
};
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    ibm866: 'cp866',
    big5: 'cp950',
};
const UTF8 = 'utf8';
export async function resolveTerminalEncoding(verbose) {
    let rawEncodingPromise;
    // Support a global environment variable to win over other mechanics
    const cliEncodingEnv = process.env['VSCODE_CLI_ENCODING'];
    if (cliEncodingEnv) {
        if (verbose) {
            console.log(`Found VSCODE_CLI_ENCODING variable: ${cliEncodingEnv}`);
        }
        rawEncodingPromise = Promise.resolve(cliEncodingEnv);
    }
    // Windows: educated guess
    else if (isWindows) {
        rawEncodingPromise = new Promise((resolve) => {
            if (verbose) {
                console.log('Running "chcp" to detect terminal encoding...');
            }
            exec('chcp', (err, stdout, stderr) => {
                if (stdout) {
                    if (verbose) {
                        console.log(`Output from "chcp" command is: ${stdout}`);
                    }
                    const windowsTerminalEncodingKeys = Object.keys(windowsTerminalEncodings);
                    for (const key of windowsTerminalEncodingKeys) {
                        if (stdout.indexOf(key) >= 0) {
                            return resolve(windowsTerminalEncodings[key]);
                        }
                    }
                }
                return resolve(undefined);
            });
        });
    }
    // Linux/Mac: use "locale charmap" command
    else {
        rawEncodingPromise = new Promise((resolve) => {
            if (verbose) {
                console.log('Running "locale charmap" to detect terminal encoding...');
            }
            exec('locale charmap', (err, stdout, stderr) => resolve(stdout));
        });
    }
    const rawEncoding = await rawEncodingPromise;
    if (verbose) {
        console.log(`Detected raw terminal encoding: ${rawEncoding}`);
    }
    if (!rawEncoding || rawEncoding.toLowerCase() === 'utf-8' || rawEncoding.toLowerCase() === UTF8) {
        return UTF8;
    }
    return toIconvLiteEncoding(rawEncoding);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFbmNvZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9ub2RlL3Rlcm1pbmFsRW5jb2RpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7O0dBRUc7QUFDSCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxNQUFNLHdCQUF3QixHQUFHO0lBQ2hDLEtBQUssRUFBRSxPQUFPLEVBQUUsZ0JBQWdCO0lBQ2hDLEtBQUssRUFBRSxPQUFPLEVBQUUsd0JBQXdCO0lBQ3hDLEtBQUssRUFBRSxPQUFPLEVBQUUsbUJBQW1CO0lBQ25DLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVTtJQUMxQixLQUFLLEVBQUUsT0FBTyxFQUFFLGFBQWE7SUFDN0IsS0FBSyxFQUFFLE9BQU8sRUFBRSxZQUFZO0lBQzVCLEtBQUssRUFBRSxPQUFPLEVBQUUsb0JBQW9CO0lBQ3BDLEtBQUssRUFBRSxPQUFPLEVBQUUsU0FBUztJQUN6QixLQUFLLEVBQUUsT0FBTyxFQUFFLFVBQVU7SUFDMUIsS0FBSyxFQUFFLE9BQU8sRUFBRSxlQUFlO0lBQy9CLEtBQUssRUFBRSxPQUFPLEVBQUUscUJBQXFCO0lBQ3JDLE1BQU0sRUFBRSxRQUFRLEVBQUUsc0JBQXNCO0NBQ3hDLENBQUE7QUFFRCxTQUFTLG1CQUFtQixDQUFDLFlBQW9CO0lBQ2hELE1BQU0sc0JBQXNCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7SUFDdEYsTUFBTSxNQUFNLEdBQUcsNEJBQTRCLENBQUMs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