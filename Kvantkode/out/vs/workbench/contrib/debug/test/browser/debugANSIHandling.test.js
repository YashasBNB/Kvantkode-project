/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isHTMLSpanElement } from '../../../../../base/browser/dom.js';
import { Color, RGBA } from '../../../../../base/common/color.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { registerColors } from '../../../terminal/common/terminalColorRegistry.js';
import { appendStylizedStringToContainer, calcANSI8bitColor, handleANSIOutput, } from '../../browser/debugANSIHandling.js';
import { LinkDetector } from '../../browser/linkDetector.js';
import { createTestSession } from './callStack.test.js';
import { createMockDebugModel } from './mockDebugModel.js';
suite('Debug - ANSI Handling', () => {
    let disposables;
    let model;
    let session;
    let linkDetector;
    /**
     * Instantiate services for use by the functions being tested.
     */
    setup(() => {
        disposables = new DisposableStore();
        model = createMockDebugModel(disposables);
        session = createTestSession(model);
        const instantiationService = (workbenchInstantiationService(undefined, disposables));
        linkDetector = instantiationService.createInstance(LinkDetector);
        registerColors();
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('appendStylizedStringToContainer', () => {
        const root = document.createElement('span');
        let child;
        assert.strictEqual(0, root.children.length);
        appendStylizedStringToContainer(root, 'content1', ['class1', 'class2'], linkDetector, session.root, undefined, undefined, undefined, undefined, 0);
        appendStylizedStringToContainer(root, 'content2', ['class2', 'class3'], linkDetector, session.root, undefined, undefined, undefined, undefined, 0);
        assert.strictEqual(2, root.children.length);
        child = root.firstChild;
        if (isHTMLSpanElement(child)) {
            assert.strictEqual('content1', child.textContent);
            assert(child.classList.contains('class1'));
            assert(child.classList.contains('class2'));
        }
        else {
            assert.fail('Unexpected assertion error');
        }
        child = root.lastChild;
        if (isHTMLSpanElement(child)) {
            assert.strictEqual('content2', child.textContent);
            assert(child.classList.contains('class2'));
            assert(child.classList.contains('class3'));
        }
        else {
            assert.fail('Unexpected assertion error');
        }
    });
    /**
     * Apply an ANSI sequence to {@link #getSequenceOutput}.
     *
     * @param sequence The ANSI sequence to stylize.
     * @returns An {@link HTMLSpanElement} that contains the stylized text.
     */
    function getSequenceOutput(sequence) {
        const root = handleANSIOutput(sequence, linkDetector, session.root, []);
        assert.strictEqual(1, root.children.length);
        const child = root.lastChild;
        if (isHTMLSpanElement(child)) {
            return child;
        }
        else {
            assert.fail('Unexpected assertion error');
        }
    }
    /**
     * Assert that a given ANSI sequence maintains added content following the ANSI code, and that
     * the provided {@param assertion} passes.
     *
     * @param sequence The ANSI sequence to verify. The provided sequence should contain ANSI codes
     * only, and should not include actual text content as it is provided by this function.
     * @param assertion The function used to verify the output.
     */
    function assertSingleSequenceElement(sequence, assertion) {
        const child = getSequenceOutput(sequence + 'content');
        assert.strictEqual('content', child.textContent);
        assertion(child);
    }
    /**
     * Assert that a given DOM element has the custom inline CSS style matching
     * the color value provided.
     * @param element The HTML span element to look at.
     * @param colorType If `foreground`, will check the element's css `color`;
     * if `background`, will check the element's css `backgroundColor`.
     * if `underline`, will check the elements css `textDecorationColor`.
     * @param color RGBA object to compare color to. If `undefined` or not provided,
     * will assert that no value is set.
     * @param message Optional custom message to pass to assertion.
     * @param colorShouldMatch Optional flag (defaults TO true) which allows caller to indicate that the color SHOULD NOT MATCH
     * (for testing changes to theme colors where we need color to have changed but we don't know exact color it should have
     * changed to (but we do know the color it should NO LONGER BE))
     */
    function assertInlineColor(element, colorType, color, message, colorShouldMatch = true) {
        if (color !== undefined) {
            const cssColor = Color.Format.CSS.formatRGB(new Color(color));
            if (colorType === 'background') {
                const styleBefore = element.style.backgroundColor;
                element.style.backgroundColor = cssColor;
                assert((styleBefore === element.style.backgroundColor) === colorShouldMatch, message ||
                    `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
            else if (colorType === 'foreground') {
                const styleBefore = element.style.color;
                element.style.color = cssColor;
                assert((styleBefore === element.style.color) === colorShouldMatch, message ||
                    `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
            else {
                const styleBefore = element.style.textDecorationColor;
                element.style.textDecorationColor = cssColor;
                assert((styleBefore === element.style.textDecorationColor) === colorShouldMatch, message ||
                    `Incorrect ${colorType} color style found (found color: ${styleBefore}, expected ${cssColor}).`);
            }
        }
        else {
            if (colorType === 'background') {
                assert(!element.style.backgroundColor, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
            else if (colorType === 'foreground') {
                assert(!element.style.color, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
            else {
                assert(!element.style.textDecorationColor, message || `Defined ${colorType} color style found when it should not have been defined`);
            }
        }
    }
    test('Expected single sequence operation', () => {
        // Bold code
        assertSingleSequenceElement('\x1b[1m', (child) => {
            assert(child.classList.contains('code-bold'), 'Bold formatting not detected after bold ANSI code.');
        });
        // Italic code
        assertSingleSequenceElement('\x1b[3m', (child) => {
            assert(child.classList.contains('code-italic'), 'Italic formatting not detected after italic ANSI code.');
        });
        // Underline code
        assertSingleSequenceElement('\x1b[4m', (child) => {
            assert(child.classList.contains('code-underline'), 'Underline formatting not detected after underline ANSI code.');
        });
        for (let i = 30; i <= 37; i++) {
            const customClassName = 'code-foreground-colored';
            // Foreground colour class
            assertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom foreground class not found on element after foreground ANSI code #${i}.`);
            });
            // Cancellation code removes colour class
            assertSingleSequenceElement('\x1b[' + i + ';39m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom foreground class still found after foreground cancellation code.');
                assertInlineColor(child, 'foreground', undefined, 'Custom color style still found after foreground cancellation code.');
            });
        }
        for (let i = 40; i <= 47; i++) {
            const customClassName = 'code-background-colored';
            // Foreground colour class
            assertSingleSequenceElement('\x1b[' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom background class not found on element after background ANSI code #${i}.`);
            });
            // Cancellation code removes colour class
            assertSingleSequenceElement('\x1b[' + i + ';49m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom background class still found after background cancellation code.');
                assertInlineColor(child, 'foreground', undefined, 'Custom color style still found after background cancellation code.');
            });
        }
        // check all basic colors for underlines (full range is checked elsewhere, here we check cancelation)
        for (let i = 0; i <= 255; i++) {
            const customClassName = 'code-underline-colored';
            // Underline colour class
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm', (child) => {
                assert(child.classList.contains(customClassName), `Custom underline color class not found on element after underline color ANSI code 58;5;${i}m.`);
            });
            // Cancellation underline color code removes colour class
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm\x1b[59m', (child) => {
                assert(child.classList.contains(customClassName) === false, 'Custom underline color class still found after underline color cancellation code 59m.');
                assertInlineColor(child, 'underline', undefined, 'Custom underline color style still found after underline color cancellation code 59m.');
            });
        }
        // Different codes do not cancel each other
        assertSingleSequenceElement('\x1b[1;3;4;30;41m', (child) => {
            assert.strictEqual(5, child.classList.length, 'Incorrect number of classes found for different ANSI codes.');
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-italic'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-underline'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-foreground-colored'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-background-colored'), 'Different ANSI codes should not cancel each other.');
        });
        // Different codes do not ACCUMULATE more than one copy of each class
        assertSingleSequenceElement('\x1b[1;1;2;2;3;3;4;4;5;5;6;6;8;8;9;9;21;21;53;53;73;73;74;74m', (child) => {
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-italic'), 'italic missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-underline') === false, 'underline PRESENT and double underline should have removed it- Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-dim'), 'dim missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-blink'), 'blink missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-rapid-blink'), 'rapid blink mkssing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-double-underline'), 'double underline missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-hidden'), 'hidden missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-strike-through'), 'strike-through missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-overline'), 'overline missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-superscript') === false, 'superscript PRESENT and subscript should have removed it- Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert(child.classList.contains('code-subscript'), 'subscript missing Doubles of each Different ANSI codes should not cancel each other or accumulate.');
            assert.strictEqual(10, child.classList.length, 'Incorrect number of classes found for each style code sent twice ANSI codes.');
        });
        // More Different codes do not cancel each other
        assertSingleSequenceElement('\x1b[1;2;5;6;21;8;9m', (child) => {
            assert.strictEqual(7, child.classList.length, 'Incorrect number of classes found for different ANSI codes.');
            assert(child.classList.contains('code-bold'));
            assert(child.classList.contains('code-dim'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-blink'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-rapid-blink'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-double-underline'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-hidden'), 'Different ANSI codes should not cancel each other.');
            assert(child.classList.contains('code-strike-through'), 'Different ANSI codes should not cancel each other.');
        });
        // New foreground codes don't remove old background codes and vice versa
        assertSingleSequenceElement('\x1b[40;31;42;33m', (child) => {
            assert.strictEqual(2, child.classList.length);
            assert(child.classList.contains('code-background-colored'), 'New foreground ANSI code should not cancel existing background formatting.');
            assert(child.classList.contains('code-foreground-colored'), 'New background ANSI code should not cancel existing foreground formatting.');
        });
        // Duplicate codes do not change output
        assertSingleSequenceElement('\x1b[1;1;4;1;4;4;1;4m', (child) => {
            assert(child.classList.contains('code-bold'), 'Duplicate formatting codes should have no effect.');
            assert(child.classList.contains('code-underline'), 'Duplicate formatting codes should have no effect.');
        });
        // Extra terminating semicolon does not change output
        assertSingleSequenceElement('\x1b[1;4;m', (child) => {
            assert(child.classList.contains('code-bold'), 'Extra semicolon after ANSI codes should have no effect.');
            assert(child.classList.contains('code-underline'), 'Extra semicolon after ANSI codes should have no effect.');
        });
        // Cancellation code removes multiple codes
        assertSingleSequenceElement('\x1b[1;4;30;41;32;43;34;45;36;47;0m', (child) => {
            assert.strictEqual(0, child.classList.length, 'Cancellation ANSI code should clear ALL formatting.');
            assertInlineColor(child, 'background', undefined, 'Cancellation ANSI code should clear ALL formatting.');
            assertInlineColor(child, 'foreground', undefined, 'Cancellation ANSI code should clear ALL formatting.');
        });
    });
    test('Expected single 8-bit color sequence operation', () => {
        // Basic and bright color codes specified with 8-bit color code format
        for (let i = 0; i <= 15; i++) {
            // As these are controlled by theme, difficult to check actual color value
            // Foreground codes should add standard classes
            assertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-foreground-colored'), `Custom color class not found after foreground 8-bit color code 38;5;${i}`);
            });
            // Background codes should add standard classes
            assertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-background-colored'), `Custom color class not found after background 8-bit color code 48;5;${i}`);
            });
        }
        // 8-bit advanced colors
        for (let i = 16; i <= 255; i++) {
            // Foreground codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[38;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-foreground-colored'), `Custom color class not found after foreground 8-bit color code 38;5;${i}`);
                assertInlineColor(child, 'foreground', calcANSI8bitColor(i), `Incorrect or no color styling found after foreground 8-bit color code 38;5;${i}`);
            });
            // Background codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[48;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-background-colored'), `Custom color class not found after background 8-bit color code 48;5;${i}`);
                assertInlineColor(child, 'background', calcANSI8bitColor(i), `Incorrect or no color styling found after background 8-bit color code 48;5;${i}`);
            });
            // Color underline codes should add custom class and inline style
            assertSingleSequenceElement('\x1b[58;5;' + i + 'm', (child) => {
                assert(child.classList.contains('code-underline-colored'), `Custom color class not found after underline 8-bit color code 58;5;${i}`);
                assertInlineColor(child, 'underline', calcANSI8bitColor(i), `Incorrect or no color styling found after underline 8-bit color code 58;5;${i}`);
            });
        }
        // Bad (nonexistent) color should not render
        assertSingleSequenceElement('\x1b[48;5;300m', (child) => {
            assert.strictEqual(0, child.classList.length, 'Bad ANSI color codes should have no effect.');
        });
        // Should ignore any codes after the ones needed to determine color
        assertSingleSequenceElement('\x1b[48;5;100;42;77;99;4;24m', (child) => {
            assert(child.classList.contains('code-background-colored'));
            assert.strictEqual(1, child.classList.length);
            assertInlineColor(child, 'background', calcANSI8bitColor(100));
        });
    });
    test('Expected single 24-bit color sequence operation', () => {
        // 24-bit advanced colors
        for (let r = 0; r <= 255; r += 64) {
            for (let g = 0; g <= 255; g += 64) {
                for (let b = 0; b <= 255; b += 64) {
                    const color = new RGBA(r, g, b);
                    // Foreground codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[38;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-foreground-colored'), 'DOM should have "code-foreground-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'foreground', color);
                    });
                    // Background codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[48;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-background-colored'), 'DOM should have "code-foreground-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'background', color);
                    });
                    // Underline color codes should add class and inline style
                    assertSingleSequenceElement(`\x1b[58;2;${r};${g};${b}m`, (child) => {
                        assert(child.classList.contains('code-underline-colored'), 'DOM should have "code-underline-colored" class for advanced ANSI colors.');
                        assertInlineColor(child, 'underline', color);
                    });
                }
            }
        }
        // Invalid color should not render
        assertSingleSequenceElement('\x1b[38;2;4;4m', (child) => {
            assert.strictEqual(0, child.classList.length, `Invalid color code "38;2;4;4" should not add a class (classes found: ${child.classList}).`);
            assert(!child.style.color, `Invalid color code "38;2;4;4" should not add a custom color CSS (found color: ${child.style.color}).`);
        });
        // Bad (nonexistent) color should not render
        assertSingleSequenceElement('\x1b[48;2;150;300;5m', (child) => {
            assert.strictEqual(0, child.classList.length, `Nonexistent color code "48;2;150;300;5" should not add a class (classes found: ${child.classList}).`);
        });
        // Should ignore any codes after the ones needed to determine color
        assertSingleSequenceElement('\x1b[48;2;100;42;77;99;200;75m', (child) => {
            assert(child.classList.contains('code-background-colored'), `Color code with extra (valid) items "48;2;100;42;77;99;200;75" should still treat initial part as valid code and add class "code-background-custom".`);
            assert.strictEqual(1, child.classList.length, `Color code with extra items "48;2;100;42;77;99;200;75" should add one and only one class. (classes found: ${child.classList}).`);
            assertInlineColor(child, 'background', new RGBA(100, 42, 77), `Color code "48;2;100;42;77;99;200;75" should  style background-color as rgb(100,42,77).`);
        });
    });
    /**
     * Assert that a given ANSI sequence produces the expected number of {@link HTMLSpanElement} children. For
     * each child, run the provided assertion.
     *
     * @param sequence The ANSI sequence to verify.
     * @param assertions A set of assertions to run on the resulting children.
     */
    function assertMultipleSequenceElements(sequence, assertions, elementsExpected) {
        if (elementsExpected === undefined) {
            elementsExpected = assertions.length;
        }
        const root = handleANSIOutput(sequence, linkDetector, session.root, []);
        assert.strictEqual(elementsExpected, root.children.length);
        for (let i = 0; i < elementsExpected; i++) {
            const child = root.children[i];
            if (isHTMLSpanElement(child)) {
                assertions[i](child);
            }
            else {
                assert.fail('Unexpected assertion error');
            }
        }
    }
    test('Expected multiple sequence operation', () => {
        // Multiple codes affect the same text
        assertSingleSequenceElement('\x1b[1m\x1b[3m\x1b[4m\x1b[32m', (child) => {
            assert(child.classList.contains('code-bold'), 'Bold class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-italic'), 'Italic class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-underline'), 'Underline class not found after multiple different ANSI codes.');
            assert(child.classList.contains('code-foreground-colored'), 'Foreground color class not found after multiple different ANSI codes.');
        });
        // Consecutive codes do not affect previous ones
        assertMultipleSequenceElements('\x1b[1mbold\x1b[32mgreen\x1b[4munderline\x1b[3mitalic\x1b[0mnothing', [
            (bold) => {
                assert.strictEqual(1, bold.classList.length);
                assert(bold.classList.contains('code-bold'), 'Bold class not found after bold ANSI code.');
            },
            (green) => {
                assert.strictEqual(2, green.classList.length);
                assert(green.classList.contains('code-bold'), 'Bold class not found after both bold and color ANSI codes.');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (underline) => {
                assert.strictEqual(3, underline.classList.length);
                assert(underline.classList.contains('code-bold'), 'Bold class not found after bold, color, and underline ANSI codes.');
                assert(underline.classList.contains('code-foreground-colored'), 'Color class not found after color and underline ANSI codes.');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code.');
            },
            (italic) => {
                assert.strictEqual(4, italic.classList.length);
                assert(italic.classList.contains('code-bold'), 'Bold class not found after bold, color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-foreground-colored'), 'Color class not found after color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-underline'), 'Underline class not found after underline and italic ANSI codes.');
                assert(italic.classList.contains('code-italic'), 'Italic class not found after italic ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 5);
        // Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[1mbold\x1b[22m\x1b[32mgreen\x1b[4munderline\x1b[24m\x1b[3mitalic\x1b[23mjustgreen\x1b[0mnothing', [
            (bold) => {
                assert.strictEqual(1, bold.classList.length);
                assert(bold.classList.contains('code-bold'), 'Bold class not found after bold ANSI code.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-bold') === false, 'Bold class found after both bold WAS TURNED OFF with 22m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (underline) => {
                assert.strictEqual(2, underline.classList.length);
                assert(underline.classList.contains('code-foreground-colored'), 'Color class not found after color and underline ANSI codes.');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code.');
            },
            (italic) => {
                assert.strictEqual(2, italic.classList.length);
                assert(italic.classList.contains('code-foreground-colored'), 'Color class not found after color, underline, and italic ANSI codes.');
                assert(italic.classList.contains('code-underline') === false, 'Underline class found after underline WAS TURNED OFF with 24m');
                assert(italic.classList.contains('code-italic'), 'Italic class not found after italic ANSI code.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-italic') === false, 'Italic class found after italic WAS TURNED OFF with 23m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // more Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[2mdim\x1b[22m\x1b[32mgreen\x1b[5mslowblink\x1b[25m\x1b[6mrapidblink\x1b[25mjustgreen\x1b[0mnothing', [
            (dim) => {
                assert.strictEqual(1, dim.classList.length);
                assert(dim.classList.contains('code-dim'), 'Dim class not found after dim ANSI code 2m.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-dim') === false, 'Dim class found after dim WAS TURNED OFF with 22m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (slowblink) => {
                assert.strictEqual(2, slowblink.classList.length);
                assert(slowblink.classList.contains('code-foreground-colored'), 'Color class not found after color and blink ANSI codes.');
                assert(slowblink.classList.contains('code-blink'), 'Blink class not found after underline ANSI code 5m.');
            },
            (rapidblink) => {
                assert.strictEqual(2, rapidblink.classList.length);
                assert(rapidblink.classList.contains('code-foreground-colored'), 'Color class not found after color, blink, and rapid blink ANSI codes.');
                assert(rapidblink.classList.contains('code-blink') === false, 'blink class found after underline WAS TURNED OFF with 25m');
                assert(rapidblink.classList.contains('code-rapid-blink'), 'Rapid blink class not found after rapid blink ANSI code 6m.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-rapid-blink') === false, 'Rapid blink class found after rapid blink WAS TURNED OFF with 25m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // more Consecutive codes with ENDING/OFF codes do not LEAVE affect previous ones
        assertMultipleSequenceElements('\x1b[8mhidden\x1b[28m\x1b[32mgreen\x1b[9mcrossedout\x1b[29m\x1b[21mdoubleunderline\x1b[24mjustgreen\x1b[0mnothing', [
            (hidden) => {
                assert.strictEqual(1, hidden.classList.length);
                assert(hidden.classList.contains('code-hidden'), 'Hidden class not found after dim ANSI code 8m.');
            },
            (green) => {
                assert.strictEqual(1, green.classList.length);
                assert(green.classList.contains('code-hidden') === false, 'Hidden class found after Hidden WAS TURNED OFF with 28m');
                assert(green.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (crossedout) => {
                assert.strictEqual(2, crossedout.classList.length);
                assert(crossedout.classList.contains('code-foreground-colored'), 'Color class not found after color and hidden ANSI codes.');
                assert(crossedout.classList.contains('code-strike-through'), 'strike-through class not found after crossout/strikethrough ANSI code 9m.');
            },
            (doubleunderline) => {
                assert.strictEqual(2, doubleunderline.classList.length);
                assert(doubleunderline.classList.contains('code-foreground-colored'), 'Color class not found after color, hidden, and crossedout ANSI codes.');
                assert(doubleunderline.classList.contains('code-strike-through') === false, 'strike-through class found after strike-through WAS TURNED OFF with 29m');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline ANSI code 21m.');
            },
            (justgreen) => {
                assert.strictEqual(1, justgreen.classList.length);
                assert(justgreen.classList.contains('code-double-underline') === false, 'Double underline class found after double underline WAS TURNED OFF with 24m');
                assert(justgreen.classList.contains('code-foreground-colored'), 'Color class not found after color ANSI code.');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after reset ANSI code.');
            },
        ], 6);
        // underline, double underline are mutually exclusive, test underline->double underline->off and double underline->underline->off
        assertMultipleSequenceElements('\x1b[4munderline\x1b[21mdouble underline\x1b[24munderlineOff\x1b[21mdouble underline\x1b[4munderline\x1b[24munderlineOff', [
            (underline) => {
                assert.strictEqual(1, underline.classList.length);
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
            },
            (doubleunderline) => {
                assert(doubleunderline.classList.contains('code-underline') === false, 'Underline class found after double underline code 21m');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline code 21m');
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only double underline');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline off code 4m.');
            },
            (doubleunderline) => {
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline code 21m');
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only double underline');
            },
            (underline) => {
                assert(underline.classList.contains('code-double-underline') === false, 'Double underline class found after underline code 4m');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
                assert.strictEqual(1, underline.classList.length, 'should have found only underline');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline off code 4m.');
            },
        ], 6);
        // underline and strike-through and overline can exist at the same time and
        // in any combination
        assertMultipleSequenceElements('\x1b[4munderline\x1b[9mand strikethough\x1b[53mand overline\x1b[24munderlineOff\x1b[55moverlineOff\x1b[29mstriklethoughOff', [
            (underline) => {
                assert.strictEqual(1, underline.classList.length, 'should have found only underline');
                assert(underline.classList.contains('code-underline'), 'Underline class not found after underline ANSI code 4m.');
            },
            (strikethrough) => {
                assert(strikethrough.classList.contains('code-underline'), 'Underline class NOT found after strikethrough code 9m');
                assert(strikethrough.classList.contains('code-strike-through'), 'Strike through class not found after strikethrough code 9m');
                assert.strictEqual(2, strikethrough.classList.length, 'should have found underline and strikethrough');
            },
            (overline) => {
                assert(overline.classList.contains('code-underline'), 'Underline class NOT found after overline code 53m');
                assert(overline.classList.contains('code-strike-through'), 'Strike through class not found after overline code 53m');
                assert(overline.classList.contains('code-overline'), 'Overline class not found after overline code 53m');
                assert.strictEqual(3, overline.classList.length, 'should have found underline,strikethrough and overline');
            },
            (underlineoff) => {
                assert(underlineoff.classList.contains('code-underline') === false, 'Underline class found after underline off code 24m');
                assert(underlineoff.classList.contains('code-strike-through'), 'Strike through class not found after underline off code 24m');
                assert(underlineoff.classList.contains('code-overline'), 'Overline class not found after underline off code 24m');
                assert.strictEqual(2, underlineoff.classList.length, 'should have found strikethrough and overline');
            },
            (overlineoff) => {
                assert(overlineoff.classList.contains('code-underline') === false, 'Underline class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-overline') === false, 'Overline class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-strike-through'), 'Strike through class not found after overline off code 55m');
                assert.strictEqual(1, overlineoff.classList.length, 'should have found only strikethrough');
            },
            (nothing) => {
                assert(nothing.classList.contains('code-strike-through') === false, 'Strike through class found after strikethrough off code 29m');
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after strikethough OFF code 29m');
            },
        ], 6);
        // double underline and strike-through and overline can exist at the same time and
        // in any combination
        assertMultipleSequenceElements('\x1b[21mdoubleunderline\x1b[9mand strikethough\x1b[53mand overline\x1b[29mstriklethoughOff\x1b[55moverlineOff\x1b[24munderlineOff', [
            (doubleunderline) => {
                assert.strictEqual(1, doubleunderline.classList.length, 'should have found only doubleunderline');
                assert(doubleunderline.classList.contains('code-double-underline'), 'Double underline class not found after double underline ANSI code 21m.');
            },
            (strikethrough) => {
                assert(strikethrough.classList.contains('code-double-underline'), 'Double nderline class NOT found after strikethrough code 9m');
                assert(strikethrough.classList.contains('code-strike-through'), 'Strike through class not found after strikethrough code 9m');
                assert.strictEqual(2, strikethrough.classList.length, 'should have found doubleunderline and strikethrough');
            },
            (overline) => {
                assert(overline.classList.contains('code-double-underline'), 'Double underline class NOT found after overline code 53m');
                assert(overline.classList.contains('code-strike-through'), 'Strike through class not found after overline code 53m');
                assert(overline.classList.contains('code-overline'), 'Overline class not found after overline code 53m');
                assert.strictEqual(3, overline.classList.length, 'should have found doubleunderline,overline and strikethrough');
            },
            (strikethrougheoff) => {
                assert(strikethrougheoff.classList.contains('code-double-underline'), 'Double underline class NOT found after strikethrough off code 29m');
                assert(strikethrougheoff.classList.contains('code-overline'), 'Overline class NOT found after strikethrough off code 29m');
                assert(strikethrougheoff.classList.contains('code-strike-through') === false, 'Strike through class found after strikethrough off code 29m');
                assert.strictEqual(2, strikethrougheoff.classList.length, 'should have found doubleunderline and overline');
            },
            (overlineoff) => {
                assert(overlineoff.classList.contains('code-double-underline'), 'Double underline class NOT found after overline off code 55m');
                assert(overlineoff.classList.contains('code-strike-through') === false, 'Strike through class found after overline off code 55m');
                assert(overlineoff.classList.contains('code-overline') === false, 'Overline class found after overline off code 55m');
                assert.strictEqual(1, overlineoff.classList.length, 'Should have found only double underline');
            },
            (nothing) => {
                assert(nothing.classList.contains('code-double-underline') === false, 'Double underline class found after underline off code 24m');
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after underline OFF code 24m');
            },
        ], 6);
        // superscript and subscript are mutually exclusive, test superscript->subscript->off and subscript->superscript->off
        assertMultipleSequenceElements('\x1b[73msuperscript\x1b[74msubscript\x1b[75mneither\x1b[74msubscript\x1b[73msuperscript\x1b[75mneither', [
            (superscript) => {
                assert.strictEqual(1, superscript.classList.length, 'should only be superscript class');
                assert(superscript.classList.contains('code-superscript'), 'Superscript class not found after superscript ANSI code 73m.');
            },
            (subscript) => {
                assert(subscript.classList.contains('code-superscript') === false, 'Superscript class found after subscript code 74m');
                assert(subscript.classList.contains('code-subscript'), 'Subscript class not found after subscript code 74m');
                assert.strictEqual(1, subscript.classList.length, 'should have found only subscript class');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after superscript/subscript off code 75m.');
            },
            (subscript) => {
                assert(subscript.classList.contains('code-subscript'), 'Subscript class not found after subscript code 74m');
                assert.strictEqual(1, subscript.classList.length, 'should have found only subscript class');
            },
            (superscript) => {
                assert(superscript.classList.contains('code-subscript') === false, 'Subscript class found after superscript code 73m');
                assert(superscript.classList.contains('code-superscript'), 'Superscript class not found after superscript ANSI code 73m.');
                assert.strictEqual(1, superscript.classList.length, 'should have found only superscript class');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more style classes still found after superscipt/subscript off code 75m.');
            },
        ], 6);
        // Consecutive font codes switch to new font class and remove previous and then final switch to default font removes class
        assertMultipleSequenceElements('\x1b[11mFont1\x1b[12mFont2\x1b[13mFont3\x1b[14mFont4\x1b[15mFont5\x1b[10mdefaultFont', [
            (font1) => {
                assert.strictEqual(1, font1.classList.length);
                assert(font1.classList.contains('code-font-1'), 'font 1 class NOT found after switch to font 1 with ANSI code 11m');
            },
            (font2) => {
                assert.strictEqual(1, font2.classList.length);
                assert(font2.classList.contains('code-font-1') === false, 'font 1 class found after switch to font 2 with ANSI code 12m');
                assert(font2.classList.contains('code-font-2'), 'font 2 class NOT found after switch to font 2 with ANSI code 12m');
            },
            (font3) => {
                assert.strictEqual(1, font3.classList.length);
                assert(font3.classList.contains('code-font-2') === false, 'font 2 class found after switch to font 3 with ANSI code 13m');
                assert(font3.classList.contains('code-font-3'), 'font 3 class NOT found after switch to font 3 with ANSI code 13m');
            },
            (font4) => {
                assert.strictEqual(1, font4.classList.length);
                assert(font4.classList.contains('code-font-3') === false, 'font 3 class found after switch to font 4 with ANSI code 14m');
                assert(font4.classList.contains('code-font-4'), 'font 4 class NOT found after switch to font 4 with ANSI code 14m');
            },
            (font5) => {
                assert.strictEqual(1, font5.classList.length);
                assert(font5.classList.contains('code-font-4') === false, 'font 4 class found after switch to font 5 with ANSI code 15m');
                assert(font5.classList.contains('code-font-5'), 'font 5 class NOT found after switch to font 5 with ANSI code 15m');
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // More Consecutive font codes switch to new font class and remove previous and then final switch to default font removes class
        assertMultipleSequenceElements('\x1b[16mFont6\x1b[17mFont7\x1b[18mFont8\x1b[19mFont9\x1b[20mFont10\x1b[10mdefaultFont', [
            (font6) => {
                assert.strictEqual(1, font6.classList.length);
                assert(font6.classList.contains('code-font-6'), 'font 6 class NOT found after switch to font 6 with ANSI code 16m');
            },
            (font7) => {
                assert.strictEqual(1, font7.classList.length);
                assert(font7.classList.contains('code-font-6') === false, 'font 6 class found after switch to font 7 with ANSI code 17m');
                assert(font7.classList.contains('code-font-7'), 'font 7 class NOT found after switch to font 7 with ANSI code 17m');
            },
            (font8) => {
                assert.strictEqual(1, font8.classList.length);
                assert(font8.classList.contains('code-font-7') === false, 'font 7 class found after switch to font 8 with ANSI code 18m');
                assert(font8.classList.contains('code-font-8'), 'font 8 class NOT found after switch to font 8 with ANSI code 18m');
            },
            (font9) => {
                assert.strictEqual(1, font9.classList.length);
                assert(font9.classList.contains('code-font-8') === false, 'font 8 class found after switch to font 9 with ANSI code 19m');
                assert(font9.classList.contains('code-font-9'), 'font 9 class NOT found after switch to font 9 with ANSI code 19m');
            },
            (font10) => {
                assert.strictEqual(1, font10.classList.length);
                assert(font10.classList.contains('code-font-9') === false, 'font 9 class found after switch to font 10 with ANSI code 20m');
                assert(font10.classList.contains('code-font-10'), `font 10 class NOT found after switch to font 10 with ANSI code 20m (${font10.classList})`);
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes (2nd series) still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // Blackletter font codes can be turned off with other font codes or 23m
        assertMultipleSequenceElements('\x1b[3mitalic\x1b[20mfont10blacklatter\x1b[23mitalicAndBlackletterOff\x1b[20mFont10Again\x1b[11mFont1\x1b[10mdefaultFont', [
            (italic) => {
                assert.strictEqual(1, italic.classList.length);
                assert(italic.classList.contains('code-italic'), 'italic class NOT found after italic code ANSI code 3m');
            },
            (font10) => {
                assert.strictEqual(2, font10.classList.length);
                assert(font10.classList.contains('code-italic'), 'no itatic class found after switch to font 10 (blackletter) with ANSI code 20m');
                assert(font10.classList.contains('code-font-10'), 'font 10 class NOT found after switch to font 10 with ANSI code 20m');
            },
            (italicAndBlackletterOff) => {
                assert.strictEqual(0, italicAndBlackletterOff.classList.length, 'italic or blackletter (font10) class found after both switched off with ANSI code 23m');
            },
            (font10) => {
                assert.strictEqual(1, font10.classList.length);
                assert(font10.classList.contains('code-font-10'), 'font 10 class NOT found after switch to font 10 with ANSI code 20m');
            },
            (font1) => {
                assert.strictEqual(1, font1.classList.length);
                assert(font1.classList.contains('code-font-10') === false, 'font 10 class found after switch to font 1 with ANSI code 11m');
                assert(font1.classList.contains('code-font-1'), 'font 1 class NOT found after switch to font 1 with ANSI code 11m');
            },
            (defaultfont) => {
                assert.strictEqual(0, defaultfont.classList.length, 'One or more font style classes (2nd series) still found after reset to default font with ANSI code 10m.');
            },
        ], 6);
        // italic can be turned on/off with affecting font codes 1-9  (italic off will clear 'blackletter'(font 23) as per spec)
        assertMultipleSequenceElements('\x1b[3mitalic\x1b[12mfont2\x1b[23mitalicOff\x1b[3mitalicFont2\x1b[10mjustitalic\x1b[23mnothing', [
            (italic) => {
                assert.strictEqual(1, italic.classList.length);
                assert(italic.classList.contains('code-italic'), 'italic class NOT found after italic code ANSI code 3m');
            },
            (font10) => {
                assert.strictEqual(2, font10.classList.length);
                assert(font10.classList.contains('code-italic'), 'no itatic class found after switch to font 2 with ANSI code 12m');
                assert(font10.classList.contains('code-font-2'), 'font 2 class NOT found after switch to font 2 with ANSI code 12m');
            },
            (italicOff) => {
                assert.strictEqual(1, italicOff.classList.length, 'italic class found after both switched off with ANSI code 23m');
                assert(italicOff.classList.contains('code-italic') === false, 'itatic class found after switching it OFF with ANSI code 23m');
                assert(italicOff.classList.contains('code-font-2'), 'font 2 class NOT found after switching italic off with ANSI code 23m');
            },
            (italicFont2) => {
                assert.strictEqual(2, italicFont2.classList.length);
                assert(italicFont2.classList.contains('code-italic'), 'no itatic class found after italic ANSI code 3m');
                assert(italicFont2.classList.contains('code-font-2'), 'font 2 class NOT found after italic ANSI code 3m');
            },
            (justitalic) => {
                assert.strictEqual(1, justitalic.classList.length);
                assert(justitalic.classList.contains('code-font-2') === false, 'font 2 class found after switch to default font with ANSI code 10m');
                assert(justitalic.classList.contains('code-italic'), 'italic class NOT found after switch to default font with ANSI code 10m');
            },
            (nothing) => {
                assert.strictEqual(0, nothing.classList.length, 'One or more classes still found after final italic removal with ANSI code 23m.');
            },
        ], 6);
        // Reverse video reverses Foreground/Background colors WITH both SET and can called in sequence
        assertMultipleSequenceElements('\x1b[38;2;10;20;30mfg10,20,30\x1b[48;2;167;168;169mbg167,168,169\x1b[7m8ReverseVideo\x1b[7mDuplicateReverseVideo\x1b[27mReverseOff\x1b[27mDupReverseOff', [
            (fg10_20_30) => {
                assert.strictEqual(1, fg10_20_30.classList.length, 'Foreground ANSI color code should add one class.');
                assert(fg10_20_30.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(fg10_20_30, 'foreground', new RGBA(10, 20, 30), '24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (bg167_168_169) => {
                assert.strictEqual(2, bg167_168_169.classList.length, 'background ANSI color codes should only add a single class.');
                assert(bg167_168_169.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assertInlineColor(bg167_168_169, 'background', new RGBA(167, 168, 169), '24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(bg167_168_169.classList.contains('code-foreground-colored'), 'Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(bg167_168_169, 'foreground', new RGBA(10, 20, 30), 'Still 24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(2, reverseVideo.classList.length, 'background ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assertInlineColor(reverseVideo, 'foreground', new RGBA(167, 168, 169), 'Reversed 24-bit RGBA ANSI foreground color code (167,168,169) should add matching former background color inline style.');
                assert(reverseVideo.classList.contains('code-foreground-colored'), 'Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reverseVideo, 'background', new RGBA(10, 20, 30), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (dupReverseVideo) => {
                assert.strictEqual(2, dupReverseVideo.classList.length, 'After second Reverse Video - background ANSI color codes should only add a single class.');
                assert(dupReverseVideo.classList.contains('code-background-colored'), 'After second Reverse Video - Background ANSI color codes should add custom background color class.');
                assertInlineColor(dupReverseVideo, 'foreground', new RGBA(167, 168, 169), 'After second Reverse Video - Reversed 24-bit RGBA ANSI foreground color code (167,168,169) should add matching former background color inline style.');
                assert(dupReverseVideo.classList.contains('code-foreground-colored'), 'After second Reverse Video - Still Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(dupReverseVideo, 'background', new RGBA(10, 20, 30), 'After second Reverse Video - Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(2, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-background-colored'), 'Reversed Back - Background ANSI color codes should add custom background color class.');
                assertInlineColor(reversedBack, 'background', new RGBA(167, 168, 169), 'Reversed Back - 24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(reversedBack.classList.contains('code-foreground-colored'), 'Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reversedBack, 'foreground', new RGBA(10, 20, 30), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (dupReversedBack) => {
                assert.strictEqual(2, dupReversedBack.classList.length, '2nd Reversed Back - background ANSI color codes should only add a single class.');
                assert(dupReversedBack.classList.contains('code-background-colored'), '2nd Reversed Back - Background ANSI color codes should add custom background color class.');
                assertInlineColor(dupReversedBack, 'background', new RGBA(167, 168, 169), '2nd Reversed Back - 24-bit RGBA ANSI background color code (167,168,169) should add matching color inline style.');
                assert(dupReversedBack.classList.contains('code-foreground-colored'), '2nd Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(dupReversedBack, 'foreground', new RGBA(10, 20, 30), '2nd Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
        ], 6);
        // Reverse video reverses Foreground/Background colors WITH ONLY foreground color SET
        assertMultipleSequenceElements('\x1b[38;2;10;20;30mfg10,20,30\x1b[7m8ReverseVideo\x1b[27mReverseOff', [
            (fg10_20_30) => {
                assert.strictEqual(1, fg10_20_30.classList.length, 'Foreground ANSI color code should add one class.');
                assert(fg10_20_30.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(fg10_20_30, 'foreground', new RGBA(10, 20, 30), '24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(1, reverseVideo.classList.length, 'Background ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom background color class.');
                assert(reverseVideo.classList.contains('code-foreground-colored') === false, 'After Reverse with NO background the Foreground ANSI color codes should NOT BE SET.');
                assertInlineColor(reverseVideo, 'background', new RGBA(10, 20, 30), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former foreground color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(1, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-background-colored') === false, 'AFTER Reversed Back - Background ANSI color should NOT BE SET.');
                assert(reversedBack.classList.contains('code-foreground-colored'), 'Reversed Back -  Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(reversedBack, 'foreground', new RGBA(10, 20, 30), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching color inline style.');
            },
        ], 3);
        // Reverse video reverses Foreground/Background colors WITH ONLY background color SET
        assertMultipleSequenceElements('\x1b[48;2;167;168;169mbg167,168,169\x1b[7m8ReverseVideo\x1b[27mReverseOff', [
            (bg167_168_169) => {
                assert.strictEqual(1, bg167_168_169.classList.length, 'Background ANSI color code should add one class.');
                assert(bg167_168_169.classList.contains('code-background-colored'), 'Background ANSI color codes should add custom foreground color class.');
                assertInlineColor(bg167_168_169, 'background', new RGBA(167, 168, 169), '24-bit RGBA ANSI color code (167, 168, 169) should add matching background color inline style.');
            },
            (reverseVideo) => {
                assert.strictEqual(1, reverseVideo.classList.length, 'After ReverseVideo Foreground ANSI color codes should only add a single class.');
                assert(reverseVideo.classList.contains('code-foreground-colored'), 'After ReverseVideo Foreground ANSI color codes should add custom background color class.');
                assert(reverseVideo.classList.contains('code-background-colored') === false, 'After Reverse with NO foreground color the background ANSI color codes should BE SET.');
                assertInlineColor(reverseVideo, 'foreground', new RGBA(167, 168, 169), 'Reversed 24-bit RGBA ANSI background color code (10,20,30) should add matching former background color inline style.');
            },
            (reversedBack) => {
                assert.strictEqual(1, reversedBack.classList.length, 'Reversed Back - background ANSI color codes should only add a single class.');
                assert(reversedBack.classList.contains('code-foreground-colored') === false, 'AFTER Reversed Back - Foreground ANSI color should NOT BE SET.');
                assert(reversedBack.classList.contains('code-background-colored'), 'Reversed Back -  Background ANSI color codes should add custom background color class.');
                assertInlineColor(reversedBack, 'background', new RGBA(167, 168, 169), 'Reversed Back -  24-bit RGBA ANSI color code (10,20,30) should add matching background color inline style.');
            },
        ], 3);
        // Underline color Different types of color codes still cancel each other
        assertMultipleSequenceElements('\x1b[58;2;101;102;103m24bitUnderline101,102,103\x1b[58;5;3m8bitsimpleUnderline\x1b[58;2;104;105;106m24bitUnderline104,105,106\x1b[58;5;101m8bitadvanced\x1b[58;2;200;200;200munderline200,200,200\x1b[59mUnderlineColorResetToDefault', [
            (adv24Bit) => {
                assert.strictEqual(1, adv24Bit.classList.length, 'Underline ANSI color codes should only add a single class (1).');
                assert(adv24Bit.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24Bit, 'underline', new RGBA(101, 102, 103), '24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.');
            },
            (adv8BitSimple) => {
                assert.strictEqual(1, adv8BitSimple.classList.length, 'Multiple underline ANSI color codes should only add a single class (2).');
                assert(adv8BitSimple.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                // changed to simple theme color, don't know exactly what it should be, but it should NO LONGER BE 101,102,103
                assertInlineColor(adv8BitSimple, 'underline', new RGBA(101, 102, 103), 'Change to theme color SHOULD NOT STILL BE 24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.', false);
            },
            (adv24BitAgain) => {
                assert.strictEqual(1, adv24BitAgain.classList.length, 'Multiple underline ANSI color codes should only add a single class (3).');
                assert(adv24BitAgain.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24BitAgain, 'underline', new RGBA(104, 105, 106), '24-bit RGBA ANSI color code (100,100,100) should add matching color inline style.');
            },
            (adv8BitAdvanced) => {
                assert.strictEqual(1, adv8BitAdvanced.classList.length, 'Multiple underline ANSI color codes should only add a single class (4).');
                assert(adv8BitAdvanced.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                // changed to 8bit advanced color, don't know exactly what it should be, but it should NO LONGER BE 104,105,106
                assertInlineColor(adv8BitAdvanced, 'underline', new RGBA(104, 105, 106), 'Change to theme color SHOULD NOT BE 24-bit RGBA ANSI color code (104,105,106) should add matching color inline style.', false);
            },
            (adv24BitUnderlin200) => {
                assert.strictEqual(1, adv24BitUnderlin200.classList.length, 'Multiple underline ANSI color codes should only add a single class 4.');
                assert(adv24BitUnderlin200.classList.contains('code-underline-colored'), 'Underline ANSI color codes should add custom underline color class.');
                assertInlineColor(adv24BitUnderlin200, 'underline', new RGBA(200, 200, 200), 'after change underline color SHOULD BE 24-bit RGBA ANSI color code (200,200,200) should add matching color inline style.');
            },
            (underlineColorResetToDefault) => {
                assert.strictEqual(0, underlineColorResetToDefault.classList.length, 'After Underline Color reset to default NO underline color class should be set.');
                assertInlineColor(underlineColorResetToDefault, 'underline', undefined, 'after RESET TO DEFAULT underline color SHOULD NOT BE SET (no color inline style.)');
            },
        ], 6);
        // Different types of color codes still cancel each other
        assertMultipleSequenceElements('\x1b[34msimple\x1b[38;2;101;102;103m24bit\x1b[38;5;3m8bitsimple\x1b[38;2;104;105;106m24bitAgain\x1b[38;5;101m8bitadvanced', [
            (simple) => {
                assert.strictEqual(1, simple.classList.length, 'Foreground ANSI color code should add one class.');
                assert(simple.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
            },
            (adv24Bit) => {
                assert.strictEqual(1, adv24Bit.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv24Bit.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(adv24Bit, 'foreground', new RGBA(101, 102, 103), '24-bit RGBA ANSI color code (101,102,103) should add matching color inline style.');
            },
            (adv8BitSimple) => {
                assert.strictEqual(1, adv8BitSimple.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv8BitSimple.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                //color is theme based, so we can't check what it should be but we know it should NOT BE 101,102,103 anymore
                assertInlineColor(adv8BitSimple, 'foreground', new RGBA(101, 102, 103), 'SHOULD NOT LONGER BE 24-bit RGBA ANSI color code (101,102,103) after simple color change.', false);
            },
            (adv24BitAgain) => {
                assert.strictEqual(1, adv24BitAgain.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv24BitAgain.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                assertInlineColor(adv24BitAgain, 'foreground', new RGBA(104, 105, 106), '24-bit RGBA ANSI color code (104,105,106) should add matching color inline style.');
            },
            (adv8BitAdvanced) => {
                assert.strictEqual(1, adv8BitAdvanced.classList.length, 'Multiple foreground ANSI color codes should only add a single class.');
                assert(adv8BitAdvanced.classList.contains('code-foreground-colored'), 'Foreground ANSI color codes should add custom foreground color class.');
                // color should NO LONGER BE 104,105,106
                assertInlineColor(adv8BitAdvanced, 'foreground', new RGBA(104, 105, 106), 'SHOULD NOT LONGER BE 24-bit RGBA ANSI color code (104,105,106) after advanced color change.', false);
            },
        ], 5);
    });
    /**
     * Assert that the provided ANSI sequence exactly matches the text content of the resulting
     * {@link HTMLSpanElement}.
     *
     * @param sequence The ANSI sequence to verify.
     */
    function assertSequencestrictEqualToContent(sequence) {
        const child = getSequenceOutput(sequence);
        assert(child.textContent === sequence);
    }
    test('Invalid codes treated as regular text', () => {
        // Individual components of ANSI code start are printed
        assertSequencestrictEqualToContent('\x1b');
        assertSequencestrictEqualToContent('[');
        // Unsupported sequence prints both characters
        assertSequencestrictEqualToContent('\x1b[');
        // Random strings are displayed properly
        for (let i = 0; i < 50; i++) {
            const uuid = generateUuid();
            assertSequencestrictEqualToContent(uuid);
        }
    });
    /**
     * Assert that a given ANSI sequence maintains added content following the ANSI code, and that
     * the expression itself is thrown away.
     *
     * @param sequence The ANSI sequence to verify. The provided sequence should contain ANSI codes
     * only, and should not include actual text content as it is provided by this function.
     */
    function assertEmptyOutput(sequence) {
        const child = getSequenceOutput(sequence + 'content');
        assert.strictEqual('content', child.textContent);
        assert.strictEqual(0, child.classList.length);
    }
    test('Empty sequence output', () => {
        const sequences = [
            // No colour codes
            '',
            '\x1b[;m',
            '\x1b[1;;m',
            '\x1b[m',
            '\x1b[99m',
        ];
        sequences.forEach((sequence) => {
            assertEmptyOutput(sequence);
        });
        // Check other possible ANSI terminators
        const terminators = 'ABCDHIJKfhmpsu'.split('');
        terminators.forEach((terminator) => {
            assertEmptyOutput('\x1b[content' + terminator);
        });
    });
    test('calcANSI8bitColor', () => {
        // Invalid values
        // Negative (below range), simple range, decimals
        for (let i = -10; i <= 15; i += 0.5) {
            assert(calcANSI8bitColor(i) === undefined, 'Values less than 16 passed to calcANSI8bitColor should return undefined.');
        }
        // In-range range decimals
        for (let i = 16.5; i < 254; i += 1) {
            assert(calcANSI8bitColor(i) === undefined, 'Floats passed to calcANSI8bitColor should return undefined.');
        }
        // Above range
        for (let i = 256; i < 300; i += 0.5) {
            assert(calcANSI8bitColor(i) === undefined, 'Values grather than 255 passed to calcANSI8bitColor should return undefined.');
        }
        // All valid colors
        for (let red = 0; red <= 5; red++) {
            for (let green = 0; green <= 5; green++) {
                for (let blue = 0; blue <= 5; blue++) {
                    const colorOut = calcANSI8bitColor(16 + red * 36 + green * 6 + blue);
                    assert(colorOut.r === Math.round(red * (255 / 5)), 'Incorrect red value encountered for color');
                    assert(colorOut.g === Math.round(green * (255 / 5)), 'Incorrect green value encountered for color');
                    assert(colorOut.b === Math.round(blue * (255 / 5)), 'Incorrect balue value encountered for color');
                }
            }
        }
        // All grays
        for (let i = 232; i <= 255; i++) {
            const grayOut = calcANSI8bitColor(i);
            assert(grayOut.r === grayOut.g);
            assert(grayOut.r === grayOut.b);
            assert(grayOut.r === Math.round(((i - 232) / 23) * 255));
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9icm93c2VyL2RlYnVnQU5TSUhhbmRsaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEYsT0FBTyxFQUNOLCtCQUErQixFQUMvQixpQkFBaUIsRUFDakIsZ0JBQWdCLEdBQ2hCLE1BQU0sb0NBQW9DLENBQUE7QUFFM0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRTVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRTFELEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDbkMsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksS0FBaUIsQ0FBQTtJQUNyQixJQUFJLE9BQXFCLENBQUE7SUFDekIsSUFBSSxZ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