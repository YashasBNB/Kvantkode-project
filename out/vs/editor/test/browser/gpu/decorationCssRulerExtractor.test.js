/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DecorationCssRuleExtractor } from '../../../browser/gpu/css/decorationCssRuleExtractor.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { $, getActiveDocument } from '../../../../base/browser/dom.js';
function randomClass() {
    return 'test-class-' + generateUuid();
}
suite('DecorationCssRulerExtractor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let doc;
    let container;
    let extractor;
    let testClassName;
    function addStyleElement(content) {
        const styleElement = $('style');
        styleElement.textContent = content;
        container.append(styleElement);
    }
    function assertStyles(className, expectedCssText) {
        deepStrictEqual(extractor.getStyleRules(container, className).map((e) => e.cssText), expectedCssText);
    }
    setup(() => {
        doc = getActiveDocument();
        extractor = store.add(new DecorationCssRuleExtractor());
        testClassName = randomClass();
        container = $('div');
        doc.body.append(container);
    });
    teardown(() => {
        container.remove();
    });
    test('unknown class should give no styles', () => {
        assertStyles(randomClass(), []);
    });
    test('single style should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; }`);
        assertStyles(testClassName, [`.${testClassName} { color: red; }`]);
    });
    test('multiple styles from the same selector should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; opacity: 0.5; }`);
        assertStyles(testClassName, [`.${testClassName} { color: red; opacity: 0.5; }`]);
    });
    test('multiple styles from  different selectors should be picked up', () => {
        addStyleElement([
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ].join('\n'));
        assertStyles(testClassName, [
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ]);
    });
    test('multiple styles from the different stylesheets should be picked up', () => {
        addStyleElement(`.${testClassName} { color: red; opacity: 0.5; }`);
        addStyleElement(`.${testClassName}:hover { opacity: 1; }`);
        assertStyles(testClassName, [
            `.${testClassName} { color: red; opacity: 0.5; }`,
            `.${testClassName}:hover { opacity: 1; }`,
        ]);
    });
    test('should not pick up styles from selectors where the prefix is the class', () => {
        addStyleElement([
            `.${testClassName} { color: red; }`,
            `.${testClassName}-ignoreme { opacity: 1; }`,
            `.${testClassName}fake { opacity: 1; }`,
        ].join('\n'));
        assertStyles(testClassName, [`.${testClassName} { color: red; }`]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVyRXh0cmFjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL2dwdS9kZWNvcmF0aW9uQ3NzUnVsZXJFeHRyYWN0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdEUsU0FBUyxXQUFXO0lBQ25CLE9BQU8sYUFBYSxHQUFHLFlBQVksRUFBRSxDQUFBO0FBQ3RDLENBQUM7QUFFRCxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxHQUFhLENBQUE7SUFDakIsSUFBSSxTQUFzQixDQUFBO0lBQzFCLElBQUksU0FBcUMsQ0FBQTtJQUN6QyxJQUFJLGFBQXFCLENBQUE7SUFFekIsU0FBUyxlQUFlLENBQUMsT0FBZTtRQUN2QyxNQUFNLFlBQVksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0IsWUFBWSxDQUFDLFdBQVcsR0FBRyxPQUFPLENBQUE7UUFDbEMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRUQsU0FBUyxZQUFZLENBQUMsU0FBaUIsRUFBRSxlQUF5QjtRQUNqRSxlQUFlLENBQ2Qs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