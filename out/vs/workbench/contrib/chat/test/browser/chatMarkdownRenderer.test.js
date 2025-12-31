/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ChatMarkdownRenderer } from '../../browser/chatMarkdownRenderer.js';
import { ITrustedDomainService } from '../../../url/browser/trustedDomainService.js';
import { MockTrustedDomainService } from '../../../url/test/browser/mockTrustedDomainService.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
suite('ChatMarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let testRenderer;
    setup(() => {
        const instantiationService = store.add(workbenchInstantiationService(undefined, store));
        instantiationService.stub(ITrustedDomainService, new MockTrustedDomainService(['http://allowed.com']));
        testRenderer = instantiationService.createInstance(ChatMarkdownRenderer, {});
    });
    test('simple', async () => {
        const md = new MarkdownString('a');
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.textContent);
    });
    test('supportHtml with one-line markdown', async () => {
        const md = new MarkdownString('**hello**');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
        const md2 = new MarkdownString('1. [_hello_](https://example.com) test **text**');
        md2.supportHtml = true;
        const result2 = store.add(testRenderer.render(md2));
        await assertSnapshot(result2.element.outerHTML);
    });
    test('invalid HTML', async () => {
        const md = new MarkdownString('1<canvas>2<details>3</details></canvas>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('invalid HTML with attributes', async () => {
        const md = new MarkdownString('1<details id="id1" style="display: none">2<details id="my id 2">3</details></details>4');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('valid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<ul>
	<li>1</li>
	<li><b>hi</b></li>
</ul>
<pre><code>code here</code></pre>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('mixed valid and invalid HTML', async () => {
        const md = new MarkdownString(`
<h1>heading</h1>
<details>
<ul>
	<li><span><details><i>1</i></details></span></li>
	<li><b>hi</b></li>
</ul>
</details>
<pre><canvas>canvas here</canvas></pre><details></details>`);
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('self-closing elements', async () => {
        const md = new MarkdownString('<area><hr><br><input type="text" value="test">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('html comments', async () => {
        const md = new MarkdownString('<!-- comment1 <div></div> --><div>content</div><!-- comment2 -->');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('CDATA', async () => {
        const md = new MarkdownString('<![CDATA[<div>content</div>]]>');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
    test('remote images', async () => {
        const md = new MarkdownString('<img src="http://allowed.com/image.jpg"> <img src="http://disallowed.com/image.jpg">');
        md.supportHtml = true;
        const result = store.add(testRenderer.render(md));
        await assertSnapshot(result.element.outerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9icm93c2VyL2NoYXRNYXJrZG93blJlbmRlcmVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVqRyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxZQUFrQyxDQUFBO0lBQ3RDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixNQUFNLG9CQUFvQixHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDdkYsb0JBQW9CLENBQUMsSUFBSSxDQUN4QixxQkFBcUIsRUFDckIsSUFBSSx3QkFBd0IsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FDcEQsQ0FBQTtRQUNELFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxDQUFD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