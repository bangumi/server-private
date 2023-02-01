import * as lo from 'lodash-es';
import { escape } from 'lodash-es';

export interface Options {
  /**
   * 是否允许 `[code]`
   *
   * @default true
   */
  parseCode?: boolean;
}

export interface Code {
  regexp: RegExp;
  replacement: ((substring: string, ...args: string[]) => string) | string;
}

function maybeUrl(s: string): string {
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }

  return 'http://' + s;
}

const urlCodes: {
  regexp: RegExp;
  replacement: (substring: string, ...args: string[]) => string;
}[] = [
  {
    regexp: new RegExp('\\[url=(.+?)](.+?)\\[/url]', 'igms'),
    replacement: (match, p1, p2) => {
      if (p1.startsWith('https://') || p1.startsWith('http://')) {
        return `<a href="${escape(
          p1,
        )}" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt="">${escape(p2)}</a>`;
      }
      return match;
    },
  },
  {
    regexp: new RegExp('\\[img](.+?)\\[/img]', 'igms'),
    replacement: (match, p1) => {
      return `<img src="${escape(
        maybeUrl(p1),
      )}" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt="">`;
    },
  },
  {
    regexp: new RegExp('\\[url](.+?)\\[/url]', 'igms'),
    replacement: (match, p1) =>
      `<a href="${escape(
        maybeUrl(p1),
      )}" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt="">${escape(p1)}</a>`,
  },
];

class BBCode {
  codes: readonly Code[] = [];

  opt: { parseCode: boolean };

  constructor(codes: readonly Code[], { parseCode = true }: Options = {}) {
    this.codes = codes;

    this.opt = {
      parseCode,
    };
  }

  /** Parse */
  parse(text: string): string {
    let withoutCode = this.opt.parseCode
      ? text.replaceAll(/\[code](.+)\[\/code]/g, (match: string, p1: string) => this.parseCode(p1))
      : text;

    for (const code of urlCodes) {
      withoutCode = withoutCode.replaceAll(code.regexp, code.replacement);
    }

    for (const code of this.codes) {
      // @ts-expect-error replacement 可以是 string 或者函数，但是这里ts没法正确处理。
      withoutCode = withoutCode.replaceAll(code.regexp, code.replacement);
    }

    withoutCode = withoutCode.replaceAll('\r\n', '<br>\n').replaceAll('\n', '<br>\n');

    if (this.opt.parseCode) {
      for (const [id, code] of Object.entries(this.codeTag)) {
        withoutCode = withoutCode.replaceAll(this.genParseCodeMark(id), code);
      }
    }

    return withoutCode;
  }

  id = 0;
  codeTag: Record<string, string> = {};

  private parseCode(code: string) {
    this.codeTag[this.id] = lo.escape(code);
    const mark =
      '<div class="codeHighlight"><pre>' + this.genParseCodeMark(this.id) + '</pre></div>';
    this.id++;
    return mark;
  }

  private genParseCodeMark(id: number | string) {
    const mark = '8848213b4dd8e320';
    return `<${mark}#${id}>`;
  }
}

const mobileCodes = Object.entries({
  [new RegExp('\\[br]').source]: '<br>',

  [new RegExp('\\[b](.+?)\\[/b]').source]: (match, p1) =>
    `<span style="font-weight:bold;">${escape(p1)}</span>`,
  [new RegExp('\\[i](.+?)\\[/i]').source]: (match, p1) =>
    `<span style="font-style:italic">${escape(p1)}</span>`,
  [new RegExp('\\[s](.+?)\\[/s]').source]: (match, p1) =>
    `<span style="text-decoration: line-through;">${escape(p1)}</span>`,
  [new RegExp('\\[u](.+?)\\[/u]').source]: (match, p1) =>
    `<span style="text-decoration: underline;">${escape(p1)}</span>`,

  [/\s*\[quote][\n\r]*(.+?)[\n\r]*\[\/quote]/gis.source]: (match, p1) =>
    `<div class="quote"><q>${escape(p1)}</q></div>`,

  '\\[color=(.+?)\\](.+?)\\[/color\\]': (match, p1, p2) =>
    `<span style="color:${escape(p1)}">${escape(p2)}</span>`,
  '\\[size=([0-9]+)\\](.+?)\\[/size\\]': (match, p1, p2) =>
    `<span style="font-size:${escape(p1)}px; line-height:${escape(p1)}px;">${escape(p2)}</span>\n`,
  [/\[mask](.+)\[\/mask]/.source]: (match, p1) =>
    `<span style="background-color:#555;color:#555;border:1px solid #555;">${escape(p1)}</span>`,

  [/\(bgm123\)/g.source]: '<img src="/img/smiles/tv/100.gif" smileid="139" alt="(bgm123)">',
  [/\(bgm122\)/g.source]: '<img src="/img/smiles/tv/99.gif" smileid="138" alt="(bgm122)">',
  [/\(bgm121\)/g.source]: '<img src="/img/smiles/tv/98.gif" smileid="137" alt="(bgm121)">',
  [/\(bgm120\)/g.source]: '<img src="/img/smiles/tv/97.gif" smileid="136" alt="(bgm120)">',
  [/\(bgm119\)/g.source]: '<img src="/img/smiles/tv/96.gif" smileid="135" alt="(bgm119)">',
  [/\(bgm118\)/g.source]: '<img src="/img/smiles/tv/95.gif" smileid="134" alt="(bgm118)">',
  [/\(bgm117\)/g.source]: '<img src="/img/smiles/tv/94.gif" smileid="133" alt="(bgm117)">',
  [/\(bgm116\)/g.source]: '<img src="/img/smiles/tv/93.gif" smileid="132" alt="(bgm116)">',
  [/\(bgm115\)/g.source]: '<img src="/img/smiles/tv/92.gif" smileid="131" alt="(bgm115)">',
  [/\(bgm114\)/g.source]: '<img src="/img/smiles/tv/91.gif" smileid="130" alt="(bgm114)">',
  [/\(bgm113\)/g.source]: '<img src="/img/smiles/tv/90.gif" smileid="129" alt="(bgm113)">',
  [/\(bgm112\)/g.source]: '<img src="/img/smiles/tv/89.gif" smileid="128" alt="(bgm112)">',
  [/\(bgm111\)/g.source]: '<img src="/img/smiles/tv/88.gif" smileid="127" alt="(bgm111)">',
  [/\(bgm110\)/g.source]: '<img src="/img/smiles/tv/87.gif" smileid="126" alt="(bgm110)">',
  [/\(bgm109\)/g.source]: '<img src="/img/smiles/tv/86.gif" smileid="125" alt="(bgm109)">',
  [/\(bgm108\)/g.source]: '<img src="/img/smiles/tv/85.gif" smileid="124" alt="(bgm108)">',
  [/\(bgm107\)/g.source]: '<img src="/img/smiles/tv/84.gif" smileid="123" alt="(bgm107)">',
  [/\(bgm106\)/g.source]: '<img src="/img/smiles/tv/83.gif" smileid="122" alt="(bgm106)">',
  [/\(bgm105\)/g.source]: '<img src="/img/smiles/tv/82.gif" smileid="121" alt="(bgm105)">',
  [/\(bgm104\)/g.source]: '<img src="/img/smiles/tv/81.gif" smileid="120" alt="(bgm104)">',
  [/\(bgm103\)/g.source]: '<img src="/img/smiles/tv/80.gif" smileid="119" alt="(bgm103)">',
  [/\(bgm102\)/g.source]: '<img src="/img/smiles/tv/79.gif" smileid="118" alt="(bgm102)">',
  [/\(bgm101\)/g.source]: '<img src="/img/smiles/tv/78.gif" smileid="117" alt="(bgm101)">',
  [/\(bgm100\)/g.source]: '<img src="/img/smiles/tv/77.gif" smileid="116" alt="(bgm100)">',
  [/\(bgm99\)/g.source]: '<img src="/img/smiles/tv/76.gif" smileid="115" alt="(bgm99)">',
  [/\(bgm98\)/g.source]: '<img src="/img/smiles/tv/75.gif" smileid="114" alt="(bgm98)">',
  [/\(bgm97\)/g.source]: '<img src="/img/smiles/tv/74.gif" smileid="113" alt="(bgm97)">',
  [/\(bgm96\)/g.source]: '<img src="/img/smiles/tv/73.gif" smileid="112" alt="(bgm96)">',
  [/\(bgm95\)/g.source]: '<img src="/img/smiles/tv/72.gif" smileid="111" alt="(bgm95)">',
  [/\(bgm94\)/g.source]: '<img src="/img/smiles/tv/71.gif" smileid="110" alt="(bgm94)">',
  [/\(bgm93\)/g.source]: '<img src="/img/smiles/tv/70.gif" smileid="109" alt="(bgm93)">',
  [/\(bgm92\)/g.source]: '<img src="/img/smiles/tv/69.gif" smileid="108" alt="(bgm92)">',
  [/\(bgm91\)/g.source]: '<img src="/img/smiles/tv/68.gif" smileid="107" alt="(bgm91)">',
  [/\(bgm90\)/g.source]: '<img src="/img/smiles/tv/67.gif" smileid="106" alt="(bgm90)">',
  [/\(bgm89\)/g.source]: '<img src="/img/smiles/tv/66.gif" smileid="105" alt="(bgm89)">',
  [/\(bgm88\)/g.source]: '<img src="/img/smiles/tv/65.gif" smileid="104" alt="(bgm88)">',
  [/\(bgm87\)/g.source]: '<img src="/img/smiles/tv/64.gif" smileid="103" alt="(bgm87)">',
  [/\(bgm86\)/g.source]: '<img src="/img/smiles/tv/63.gif" smileid="102" alt="(bgm86)">',
  [/\(bgm85\)/g.source]: '<img src="/img/smiles/tv/62.gif" smileid="101" alt="(bgm85)">',
  [/\(bgm84\)/g.source]: '<img src="/img/smiles/tv/61.gif" smileid="100" alt="(bgm84)">',
  [/\(bgm83\)/g.source]: '<img src="/img/smiles/tv/60.gif" smileid="99" alt="(bgm83)">',
  [/\(bgm82\)/g.source]: '<img src="/img/smiles/tv/59.gif" smileid="98" alt="(bgm82)">',
  [/\(bgm81\)/g.source]: '<img src="/img/smiles/tv/58.gif" smileid="97" alt="(bgm81)">',
  [/\(bgm80\)/g.source]: '<img src="/img/smiles/tv/57.gif" smileid="96" alt="(bgm80)">',
  [/\(bgm79\)/g.source]: '<img src="/img/smiles/tv/56.gif" smileid="95" alt="(bgm79)">',
  [/\(bgm78\)/g.source]: '<img src="/img/smiles/tv/55.gif" smileid="94" alt="(bgm78)">',
  [/\(bgm77\)/g.source]: '<img src="/img/smiles/tv/54.gif" smileid="93" alt="(bgm77)">',
  [/\(bgm76\)/g.source]: '<img src="/img/smiles/tv/53.gif" smileid="92" alt="(bgm76)">',
  [/\(bgm75\)/g.source]: '<img src="/img/smiles/tv/52.gif" smileid="91" alt="(bgm75)">',
  [/\(bgm74\)/g.source]: '<img src="/img/smiles/tv/51.gif" smileid="90" alt="(bgm74)">',
  [/\(bgm73\)/g.source]: '<img src="/img/smiles/tv/50.gif" smileid="89" alt="(bgm73)">',
  [/\(bgm72\)/g.source]: '<img src="/img/smiles/tv/49.gif" smileid="88" alt="(bgm72)">',
  [/\(bgm71\)/g.source]: '<img src="/img/smiles/tv/48.gif" smileid="87" alt="(bgm71)">',
  [/\(bgm70\)/g.source]: '<img src="/img/smiles/tv/47.gif" smileid="86" alt="(bgm70)">',
  [/\(bgm69\)/g.source]: '<img src="/img/smiles/tv/46.gif" smileid="85" alt="(bgm69)">',
  [/\(bgm68\)/g.source]: '<img src="/img/smiles/tv/45.gif" smileid="84" alt="(bgm68)">',
  [/\(bgm67\)/g.source]: '<img src="/img/smiles/tv/44.gif" smileid="83" alt="(bgm67)">',
  [/\(bgm66\)/g.source]: '<img src="/img/smiles/tv/43.gif" smileid="82" alt="(bgm66)">',
  [/\(bgm65\)/g.source]: '<img src="/img/smiles/tv/42.gif" smileid="81" alt="(bgm65)">',
  [/\(bgm64\)/g.source]: '<img src="/img/smiles/tv/41.gif" smileid="80" alt="(bgm64)">',
  [/\(bgm63\)/g.source]: '<img src="/img/smiles/tv/40.gif" smileid="79" alt="(bgm63)">',
  [/\(bgm62\)/g.source]: '<img src="/img/smiles/tv/39.gif" smileid="78" alt="(bgm62)">',
  [/\(bgm61\)/g.source]: '<img src="/img/smiles/tv/38.gif" smileid="77" alt="(bgm61)">',
  [/\(bgm60\)/g.source]: '<img src="/img/smiles/tv/37.gif" smileid="76" alt="(bgm60)">',
  [/\(bgm59\)/g.source]: '<img src="/img/smiles/tv/36.gif" smileid="75" alt="(bgm59)">',
  [/\(bgm58\)/g.source]: '<img src="/img/smiles/tv/35.gif" smileid="74" alt="(bgm58)">',
  [/\(bgm57\)/g.source]: '<img src="/img/smiles/tv/34.gif" smileid="73" alt="(bgm57)">',
  [/\(bgm56\)/g.source]: '<img src="/img/smiles/tv/33.gif" smileid="72" alt="(bgm56)">',
  [/\(bgm55\)/g.source]: '<img src="/img/smiles/tv/32.gif" smileid="71" alt="(bgm55)">',
  [/\(bgm54\)/g.source]: '<img src="/img/smiles/tv/31.gif" smileid="70" alt="(bgm54)">',
  [/\(bgm53\)/g.source]: '<img src="/img/smiles/tv/30.gif" smileid="69" alt="(bgm53)">',
  [/\(bgm52\)/g.source]: '<img src="/img/smiles/tv/29.gif" smileid="68" alt="(bgm52)">',
  [/\(bgm51\)/g.source]: '<img src="/img/smiles/tv/28.gif" smileid="67" alt="(bgm51)">',
  [/\(bgm50\)/g.source]: '<img src="/img/smiles/tv/27.gif" smileid="66" alt="(bgm50)">',
  [/\(bgm49\)/g.source]: '<img src="/img/smiles/tv/26.gif" smileid="65" alt="(bgm49)">',
  [/\(bgm48\)/g.source]: '<img src="/img/smiles/tv/25.gif" smileid="64" alt="(bgm48)">',
  [/\(bgm47\)/g.source]: '<img src="/img/smiles/tv/24.gif" smileid="63" alt="(bgm47)">',
  [/\(bgm46\)/g.source]: '<img src="/img/smiles/tv/23.gif" smileid="62" alt="(bgm46)">',
  [/\(bgm45\)/g.source]: '<img src="/img/smiles/tv/22.gif" smileid="61" alt="(bgm45)">',
  [/\(bgm44\)/g.source]: '<img src="/img/smiles/tv/21.gif" smileid="60" alt="(bgm44)">',
  [/\(bgm43\)/g.source]: '<img src="/img/smiles/tv/20.gif" smileid="59" alt="(bgm43)">',
  [/\(bgm42\)/g.source]: '<img src="/img/smiles/tv/19.gif" smileid="58" alt="(bgm42)">',
  [/\(bgm41\)/g.source]: '<img src="/img/smiles/tv/18.gif" smileid="57" alt="(bgm41)">',
  [/\(bgm40\)/g.source]: '<img src="/img/smiles/tv/17.gif" smileid="56" alt="(bgm40)">',
  [/\(bgm39\)/g.source]: '<img src="/img/smiles/tv/16.gif" smileid="55" alt="(bgm39)">',
  [/\(bgm38\)/g.source]: '<img src="/img/smiles/tv/15.gif" smileid="54" alt="(bgm38)">',
  [/\(bgm37\)/g.source]: '<img src="/img/smiles/tv/14.gif" smileid="53" alt="(bgm37)">',
  [/\(bgm36\)/g.source]: '<img src="/img/smiles/tv/13.gif" smileid="52" alt="(bgm36)">',
  [/\(bgm35\)/g.source]: '<img src="/img/smiles/tv/12.gif" smileid="51" alt="(bgm35)">',
  [/\(bgm34\)/g.source]: '<img src="/img/smiles/tv/11.gif" smileid="50" alt="(bgm34)">',
  [/\(bgm33\)/g.source]: '<img src="/img/smiles/tv/10.gif" smileid="49" alt="(bgm33)">',
  [/\(bgm32\)/g.source]: '<img src="/img/smiles/tv/09.gif" smileid="48" alt="(bgm32)">',
  [/\(bgm31\)/g.source]: '<img src="/img/smiles/tv/08.gif" smileid="47" alt="(bgm31)">',
  [/\(bgm30\)/g.source]: '<img src="/img/smiles/tv/07.gif" smileid="46" alt="(bgm30)">',
  [/\(bgm29\)/g.source]: '<img src="/img/smiles/tv/06.gif" smileid="45" alt="(bgm29)">',
  [/\(bgm28\)/g.source]: '<img src="/img/smiles/tv/05.gif" smileid="44" alt="(bgm28)">',
  [/\(bgm27\)/g.source]: '<img src="/img/smiles/tv/04.gif" smileid="43" alt="(bgm27)">',
  [/\(bgm26\)/g.source]: '<img src="/img/smiles/tv/03.gif" smileid="42" alt="(bgm26)">',
  [/\(bgm25\)/g.source]: '<img src="/img/smiles/tv/02.gif" smileid="41" alt="(bgm25)">',
  [/\(bgm24\)/g.source]: '<img src="/img/smiles/tv/01.gif" smileid="40" alt="(bgm24)">',
  [/\(bgm23\)/g.source]: '<img src="/img/smiles/bgm/23.gif" smileid="39" alt="(bgm23)">',
  [/\(bgm22\)/g.source]: '<img src="/img/smiles/bgm/22.png" smileid="38" alt="(bgm22)">',
  [/\(bgm21\)/g.source]: '<img src="/img/smiles/bgm/21.png" smileid="37" alt="(bgm21)">',
  [/\(bgm20\)/g.source]: '<img src="/img/smiles/bgm/20.png" smileid="36" alt="(bgm20)">',
  [/\(bgm19\)/g.source]: '<img src="/img/smiles/bgm/19.png" smileid="35" alt="(bgm19)">',
  [/\(bgm18\)/g.source]: '<img src="/img/smiles/bgm/18.png" smileid="34" alt="(bgm18)">',
  [/\(bgm17\)/g.source]: '<img src="/img/smiles/bgm/17.png" smileid="33" alt="(bgm17)">',
  [/\(bgm16\)/g.source]: '<img src="/img/smiles/bgm/16.png" smileid="32" alt="(bgm16)">',
  [/\(bgm15\)/g.source]: '<img src="/img/smiles/bgm/15.png" smileid="31" alt="(bgm15)">',
  [/\(bgm14\)/g.source]: '<img src="/img/smiles/bgm/14.png" smileid="30" alt="(bgm14)">',
  [/\(bgm13\)/g.source]: '<img src="/img/smiles/bgm/13.png" smileid="29" alt="(bgm13)">',
  [/\(bgm12\)/g.source]: '<img src="/img/smiles/bgm/12.png" smileid="28" alt="(bgm12)">',
  [/\(bgm11\)/g.source]: '<img src="/img/smiles/bgm/11.gif" smileid="27" alt="(bgm11)">',
  [/\(bgm10\)/g.source]: '<img src="/img/smiles/bgm/10.png" smileid="26" alt="(bgm10)">',
  [/\(bgm09\)/g.source]: '<img src="/img/smiles/bgm/09.png" smileid="25" alt="(bgm09)">',
  [/\(bgm08\)/g.source]: '<img src="/img/smiles/bgm/08.png" smileid="24" alt="(bgm08)">',
  [/\(bgm07\)/g.source]: '<img src="/img/smiles/bgm/07.png" smileid="23" alt="(bgm07)">',
  [/\(bgm06\)/g.source]: '<img src="/img/smiles/bgm/06.png" smileid="22" alt="(bgm06)">',
  [/\(bgm05\)/g.source]: '<img src="/img/smiles/bgm/05.png" smileid="21" alt="(bgm05)">',
  [/\(bgm04\)/g.source]: '<img src="/img/smiles/bgm/04.png" smileid="20" alt="(bgm04)">',
  [/\(bgm03\)/g.source]: '<img src="/img/smiles/bgm/03.png" smileid="19" alt="(bgm03)">',
  [/\(bgm02\)/g.source]: '<img src="/img/smiles/bgm/02.png" smileid="18" alt="(bgm02)">',
  [/\(bgm01\)/g.source]: '<img src="/img/smiles/bgm/01.png" smileid="17" alt="(bgm01)">',
  [/\(LOL\)/g.source]: '<img src="/img/smiles/16.gif" smileid="16" alt="LOL">',
  [/\(:P\)/g.source]: '<img src="/img/smiles/15.gif" smileid="15" alt=":P">',
  [/\(=\.,=\)/g.source]: '<img src="/img/smiles/14.gif" smileid="14" alt="=.,=">',

  // (=///=)
  [/\(=\/{3}=\)/g.source]: '<img src="/img/smiles/13.gif" smileid="13" alt="=///=">',
  [/\(= ='\)/g.source]: '<img src="/img/smiles/12.gif" smileid="12" alt="= =\'">',
  [/\(=3=\)/g.source]: '<img src="/img/smiles/11.gif" smileid="11" alt="=3=">',
  [/\(='=\)/g.source]: '<img src="/img/smiles/10.gif" smileid="10" alt="=\'=">',
  [/\(T_T\)/g.source]: '<img src="/img/smiles/9.gif" smileid="9" alt="T_T">',
  [/\(TAT\)/g.source]: '<img src="/img/smiles/8.gif" smileid="8" alt="TAT">',
  [/\(=W=\)/g.source]: '<img src="/img/smiles/7.gif" smileid="7" alt="=W=">',
  [/\(@_@\)/g.source]: '<img src="/img/smiles/6.gif" smileid="6" alt="@_@">',
  [/\(=v=\)/g.source]: '<img src="/img/smiles/5.gif" smileid="5" alt="=v=">',
  [/\(S_S\)/g.source]: '<img src="/img/smiles/4.gif" smileid="4" alt="S_S">',
  [/\(-w=\)/g.source]: '<img src="/img/smiles/3.gif" smileid="3" alt="-w=">',
  [/\(=w=\)/g.source]: '<img src="/img/smiles/2.gif" smileid="2" alt="=w=">',
  [/\(=A=\)/g.source]: '<img src="/img/smiles/1.gif" smileid="1" alt="=A=">',
} satisfies Record<string, Code['replacement']>).map(([regex, replacement]) => {
  return {
    regexp: new RegExp(regex, 'gms'),
    replacement: replacement,
  } satisfies Code;
});

export function mobileBBCode(s: string): string {
  return new BBCode(mobileCodes).parse(s);
}
