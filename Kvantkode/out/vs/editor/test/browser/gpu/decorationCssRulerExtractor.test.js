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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkNzc1J1bGVyRXh0cmFjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2Jyb3dzZXIvZ3B1L2RlY29yYXRpb25Dc3NSdWxlckV4dHJhY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RSxTQUFTLFdBQVc7SUFDbkIsT0FBTyxhQUFhLEdBQUcsWUFBWSxFQUFFLENBQUE7QUFDdEMsQ0FBQztBQUVELEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLEdBQWEsQ0FBQTtJQUNqQixJQUFJLFNBQXNCLENBQUE7SUFDMUIsSUFBSSxTQUFxQyxDQUFBO0lBQ3pDLElBQUksYUFBcUIsQ0FBQTtJQUV6QixTQUFTLGVBQWUsQ0FBQyxPQUFlO1FBQ3ZDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMvQixZQUFZLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQTtRQUNsQyxTQUFTLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQy9CLENBQUM7SUFFRCxTQUFTLFlBQVksQ0FBQyxTQUFpQixFQUFFLGVBQXlCO1FBQ2pFLGVBQWUs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