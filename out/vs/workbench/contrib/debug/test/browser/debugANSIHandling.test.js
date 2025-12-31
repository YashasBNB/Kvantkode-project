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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBTlNJSGFuZGxpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3QvYnJvd3Nlci9kZWJ1Z0FOU0lIYW5kbGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTiwrQkFBK0IsRUFDL0IsaUJBQWlCLEVBQ2pCLGdCQUFnQixHQUNoQixNQUFNLG9DQUFvQyxDQUFBO0FBRTNDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUUxRCxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLEtBQWlCLENBQUE7SUFDckIsSUFBSSxPQUFxQixDQUFBO0lBQ3pCLElBQUksWUFBMEIs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