/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { computeLinks } from '../../../common/languages/linkComputer.js';
class SimpleLinkComputerTarget {
    constructor(_lines) {
        this._lines = _lines;
        // Intentional Empty
    }
    getLineCount() {
        return this._lines.length;
    }
    getLineContent(lineNumber) {
        return this._lines[lineNumber - 1];
    }
}
function myComputeLinks(lines) {
    const target = new SimpleLinkComputerTarget(lines);
    return computeLinks(target);
}
function assertLink(text, extractedLink) {
    let startColumn = 0, endColumn = 0, chr, i = 0;
    for (i = 0; i < extractedLink.length; i++) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            startColumn = i + 1;
            break;
        }
    }
    for (i = extractedLink.length - 1; i >= 0; i--) {
        chr = extractedLink.charAt(i);
        if (chr !== ' ' && chr !== '\t') {
            endColumn = i + 2;
            break;
        }
    }
    const r = myComputeLinks([text]);
    assert.deepStrictEqual(r, [
        {
            range: {
                startLineNumber: 1,
                startColumn: startColumn,
                endLineNumber: 1,
                endColumn: endColumn,
            },
            url: extractedLink.substring(startColumn - 1, endColumn - 1),
        },
    ]);
}
suite('Editor Modes - Link Computer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Null model', () => {
        const r = computeLinks(null);
        assert.deepStrictEqual(r, []);
    });
    test('Parsing', () => {
        assertLink('x = "http://foo.bar";', '     http://foo.bar  ');
        assertLink('x = (http://foo.bar);', '     http://foo.bar  ');
        assertLink('x = [http://foo.bar];', '     http://foo.bar  ');
        assertLink("x = 'http://foo.bar';", '     http://foo.bar  ');
        assertLink('x =  http://foo.bar ;', '     http://foo.bar  ');
        assertLink('x = <http://foo.bar>;', '     http://foo.bar  ');
        assertLink('x = {http://foo.bar};', '     http://foo.bar  ');
        assertLink('(see http://foo.bar)', '     http://foo.bar  ');
        assertLink('[see http://foo.bar]', '     http://foo.bar  ');
        assertLink('{see http://foo.bar}', '     http://foo.bar  ');
        assertLink('<see http://foo.bar>', '     http://foo.bar  ');
        assertLink('<url>http://mylink.com</url>', '     http://mylink.com      ');
        assertLink('// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409', '                             https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409');
        assertLink('// Click here to learn more. https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx', '                             https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx');
        assertLink('// https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js', '   https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js');
        assertLink('<!-- !!! Do not remove !!!   WebContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->', '                                                https://go.microsoft.com/fwlink/?LinkId=166007                                                                                        ');
        assertLink('For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>', '                      https://go.microsoft.com/fwlink/?LinkId=166007         ');
        assertLink('For instructions, see https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx.</value>', '                      https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx         ');
        assertLink('x = "https://en.wikipedia.org/wiki/Zürich";', '     https://en.wikipedia.org/wiki/Zürich  ');
        assertLink('請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。', '    http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）', '     http://go.microsoft.com/fwlink/?LinkId=761051 ');
        assertLink('x = "file:///foo.bar";', '     file:///foo.bar  ');
        assertLink('x = "file://c:/foo.bar";', '     file://c:/foo.bar  ');
        assertLink('x = "file://shares/foo.bar";', '     file://shares/foo.bar  ');
        assertLink('x = "file://shäres/foo.bar";', '     file://shäres/foo.bar  ');
        assertLink('Some text, then http://www.bing.com.', '                http://www.bing.com ');
        assertLink("let url = `http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items`;", "           http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items  ");
    });
    test('issue #7855', () => {
        assertLink('7. At this point, ServiceMain has been called.  There is no functionality presently in ServiceMain, but you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!', '                                                                                                                                                 https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx                                  ');
    });
    test('issue #62278: "Ctrl + click to follow link" for IPv6 URLs', () => {
        assertLink('let x = "http://[::1]:5000/connect/token"', '         http://[::1]:5000/connect/token  ');
    });
    test('issue #70254: bold links dont open in markdown file using editor mode with ctrl + click', () => {
        assertLink('2. Navigate to **https://portal.azure.com**', '                 https://portal.azure.com  ');
    });
    test('issue #86358: URL wrong recognition pattern', () => {
        assertLink('POST|https://portal.azure.com|2019-12-05|', '     https://portal.azure.com            ');
    });
    test("issue #67022: Space as end of hyperlink isn't always good idea", () => {
        assertLink('aa  https://foo.bar/[this is foo site]  aa', '    https://foo.bar/[this is foo site]    ');
    });
    test('issue #100353: Link detection stops at ＆(double-byte)', () => {
        assertLink('aa  http://tree-mark.chips.jp/レーズン＆ベリーミックス  aa', '    http://tree-mark.chips.jp/レーズン＆ベリーミックス    ');
    });
    test('issue #121438: Link detection stops at【...】', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/【我推的孩子】 aa', '    https://zh.wikipedia.org/wiki/【我推的孩子】   ');
    });
    test('issue #121438: Link detection stops at《...》', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/《新青年》编辑部旧址 aa', '    https://zh.wikipedia.org/wiki/《新青年》编辑部旧址   ');
    });
    test('issue #121438: Link detection stops at “...”', () => {
        assertLink('aa  https://zh.wikipedia.org/wiki/“常凯申”误译事件 aa', '    https://zh.wikipedia.org/wiki/“常凯申”误译事件   ');
    });
    test('issue #150905: Colon after bare hyperlink is treated as its part', () => {
        assertLink('https://site.web/page.html: blah blah blah', 'https://site.web/page.html                ');
    });
    // Removed because of #156875
    // test('issue #151631: Link parsing stoped where comments include a single quote ', () => {
    // 	assertLink(
    // 		`aa https://regexper.com/#%2F''%2F aa`,
    // 		`   https://regexper.com/#%2F''%2F   `,
    // 	);
    // });
    test('issue #156875: Links include quotes ', () => {
        assertLink(`"This file has been converted from https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json",`, `                                   https://github.com/jeff-hykin/better-c-syntax/blob/master/autogenerated/c.tmLanguage.json  `);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlua0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvbGlua0NvbXB1dGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBdUIsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFN0YsTUFBTSx3QkFBd0I7SUFDN0IsWUFBb0IsTUFBZ0I7UUFBaEIsV0FBTSxHQUFOLE1BQU0sQ0FBVTtRQUNuQyxvQkFBb0I7SUFDckIsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUMxQixDQUFDO0lBRU0sY0FBYyxDQUFDLFVBQWtCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQztDQUNEO0FBRUQsU0FBUyxjQUFjLENBQUMsS0FBZTtJQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2xELE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQzVCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUFZLEVBQUUsYUFBcUI7SUFDdEQsSUFBSSxXQUFXLEdBQUcsQ0FBQyxFQUNsQixTQUFTLEdBQUcsQ0FBQyxFQUNiLEdBQVcsRUFDWCxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRU4sS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDM0MsR0FBRyxH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