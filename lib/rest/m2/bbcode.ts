/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */
// @ts-nocheck

/** 并不用于新前端，只是用在 /m2 支持 bbcode。 */
import { matches } from 'lodash-es';
import * as lo from 'lodash-es';

const IMGDIR = '';
const chiicode = {};
const message = '';
const PHOTO_URL = 'https://lain.bgm.tv/pic/';

export type Option = {
  smileyoff?: boolean;
  bbcodeoff?: boolean;
  htmlon?: boolean;
  allowsmilies?: boolean;
  allowbbcode?: boolean;
  allowhtml?: boolean;
  jammer?: boolean;
  parsetype?: boolean;
  authorid?: boolean;
  allowmediacode?: boolean;
  pid?: boolean;
  filter?: boolean;
};

export class ChiiCodeCore {
  public static smilies_list = {
    searcharray: {
      139: /\(bgm123\)/g,
      138: /\(bgm122\)/g,
      137: /\(bgm121\)/g,
      136: /\(bgm120\)/g,
      135: /\(bgm119\)/g,
      134: /\(bgm118\)/g,
      133: /\(bgm117\)/g,
      132: /\(bgm116\)/g,
      131: /\(bgm115\)/g,
      130: /\(bgm114\)/g,
      129: /\(bgm113\)/g,
      128: /\(bgm112\)/g,
      127: /\(bgm111\)/g,
      126: /\(bgm110\)/g,
      125: /\(bgm109\)/g,
      124: /\(bgm108\)/g,
      123: /\(bgm107\)/g,
      122: /\(bgm106\)/g,
      121: /\(bgm105\)/g,
      120: /\(bgm104\)/g,
      119: /\(bgm103\)/g,
      118: /\(bgm102\)/g,
      117: /\(bgm101\)/g,
      116: /\(bgm100\)/g,
      115: /\(bgm99\)/g,
      114: /\(bgm98\)/g,
      113: /\(bgm97\)/g,
      112: /\(bgm96\)/g,
      111: /\(bgm95\)/g,
      110: /\(bgm94\)/g,
      109: /\(bgm93\)/g,
      108: /\(bgm92\)/g,
      107: /\(bgm91\)/g,
      106: /\(bgm90\)/g,
      105: /\(bgm89\)/g,
      104: /\(bgm88\)/g,
      103: /\(bgm87\)/g,
      102: /\(bgm86\)/g,
      101: /\(bgm85\)/g,
      100: /\(bgm84\)/g,
      99: /\(bgm83\)/g,
      98: /\(bgm82\)/g,
      97: /\(bgm81\)/g,
      96: /\(bgm80\)/g,
      95: /\(bgm79\)/g,
      94: /\(bgm78\)/g,
      93: /\(bgm77\)/g,
      92: /\(bgm76\)/g,
      91: /\(bgm75\)/g,
      90: /\(bgm74\)/g,
      89: /\(bgm73\)/g,
      88: /\(bgm72\)/g,
      87: /\(bgm71\)/g,
      86: /\(bgm70\)/g,
      85: /\(bgm69\)/g,
      84: /\(bgm68\)/g,
      83: /\(bgm67\)/g,
      82: /\(bgm66\)/g,
      81: /\(bgm65\)/g,
      80: /\(bgm64\)/g,
      79: /\(bgm63\)/g,
      78: /\(bgm62\)/g,
      77: /\(bgm61\)/g,
      76: /\(bgm60\)/g,
      75: /\(bgm59\)/g,
      74: /\(bgm58\)/g,
      73: /\(bgm57\)/g,
      72: /\(bgm56\)/g,
      71: /\(bgm55\)/g,
      70: /\(bgm54\)/g,
      69: /\(bgm53\)/g,
      68: /\(bgm52\)/g,
      67: /\(bgm51\)/g,
      66: /\(bgm50\)/g,
      65: /\(bgm49\)/g,
      64: /\(bgm48\)/g,
      63: /\(bgm47\)/g,
      62: /\(bgm46\)/g,
      61: /\(bgm45\)/g,
      60: /\(bgm44\)/g,
      59: /\(bgm43\)/g,
      58: /\(bgm42\)/g,
      57: /\(bgm41\)/g,
      56: /\(bgm40\)/g,
      55: /\(bgm39\)/g,
      54: /\(bgm38\)/g,
      53: /\(bgm37\)/g,
      52: /\(bgm36\)/g,
      51: /\(bgm35\)/g,
      50: /\(bgm34\)/g,
      49: /\(bgm33\)/g,
      48: /\(bgm32\)/g,
      47: /\(bgm31\)/g,
      46: /\(bgm30\)/g,
      45: /\(bgm29\)/g,
      44: /\(bgm28\)/g,
      43: /\(bgm27\)/g,
      42: /\(bgm26\)/g,
      41: /\(bgm25\)/g,
      40: /\(bgm24\)/g,
      39: /\(bgm23\)/g,
      38: /\(bgm22\)/g,
      37: /\(bgm21\)/g,
      36: /\(bgm20\)/g,
      35: /\(bgm19\)/g,
      34: /\(bgm18\)/g,
      33: /\(bgm17\)/g,
      32: /\(bgm16\)/g,
      31: /\(bgm15\)/g,
      30: /\(bgm14\)/g,
      29: /\(bgm13\)/g,
      28: /\(bgm12\)/g,
      27: /\(bgm11\)/g,
      26: /\(bgm10\)/g,
      25: /\(bgm09\)/g,
      24: /\(bgm08\)/g,
      23: /\(bgm07\)/g,
      22: /\(bgm06\)/g,
      21: /\(bgm05\)/g,
      20: /\(bgm04\)/g,
      19: /\(bgm03\)/g,
      18: /\(bgm02\)/g,
      17: /\(bgm01\)/g,
      16: /\(LOL\)/g,
      15: /\(:P\)/g,
      14: /\(=\.,=\)/g,
      13: /\(=\/\/\/=\)/g,
      12: /\(= ='\)/g,
      11: /\(=3=\)/g,
      10: /\(='=\)/g,
      9: /\(T_T\)/g,
      8: /\(TAT\)/g,
      7: /\(=W=\)/g,
      6: /\(@_@\)/g,
      5: /\(=v=\)/g,
      4: /\(S_S\)/g,
      3: /\(-w=\)/g,
      2: /\(=w=\)/g,
      1: /\(=A=\)/g,
    } as const,
    replacearray: {
      139: '<img src="/img/smiles/tv/100.gif" smileid="139" alt="(bgm123)" />',
      138: '<img src="/img/smiles/tv/99.gif" smileid="138" alt="(bgm122)" />',
      137: '<img src="/img/smiles/tv/98.gif" smileid="137" alt="(bgm121)" />',
      136: '<img src="/img/smiles/tv/97.gif" smileid="136" alt="(bgm120)" />',
      135: '<img src="/img/smiles/tv/96.gif" smileid="135" alt="(bgm119)" />',
      134: '<img src="/img/smiles/tv/95.gif" smileid="134" alt="(bgm118)" />',
      133: '<img src="/img/smiles/tv/94.gif" smileid="133" alt="(bgm117)" />',
      132: '<img src="/img/smiles/tv/93.gif" smileid="132" alt="(bgm116)" />',
      131: '<img src="/img/smiles/tv/92.gif" smileid="131" alt="(bgm115)" />',
      130: '<img src="/img/smiles/tv/91.gif" smileid="130" alt="(bgm114)" />',
      129: '<img src="/img/smiles/tv/90.gif" smileid="129" alt="(bgm113)" />',
      128: '<img src="/img/smiles/tv/89.gif" smileid="128" alt="(bgm112)" />',
      127: '<img src="/img/smiles/tv/88.gif" smileid="127" alt="(bgm111)" />',
      126: '<img src="/img/smiles/tv/87.gif" smileid="126" alt="(bgm110)" />',
      125: '<img src="/img/smiles/tv/86.gif" smileid="125" alt="(bgm109)" />',
      124: '<img src="/img/smiles/tv/85.gif" smileid="124" alt="(bgm108)" />',
      123: '<img src="/img/smiles/tv/84.gif" smileid="123" alt="(bgm107)" />',
      122: '<img src="/img/smiles/tv/83.gif" smileid="122" alt="(bgm106)" />',
      121: '<img src="/img/smiles/tv/82.gif" smileid="121" alt="(bgm105)" />',
      120: '<img src="/img/smiles/tv/81.gif" smileid="120" alt="(bgm104)" />',
      119: '<img src="/img/smiles/tv/80.gif" smileid="119" alt="(bgm103)" />',
      118: '<img src="/img/smiles/tv/79.gif" smileid="118" alt="(bgm102)" />',
      117: '<img src="/img/smiles/tv/78.gif" smileid="117" alt="(bgm101)" />',
      116: '<img src="/img/smiles/tv/77.gif" smileid="116" alt="(bgm100)" />',
      115: '<img src="/img/smiles/tv/76.gif" smileid="115" alt="(bgm99)" />',
      114: '<img src="/img/smiles/tv/75.gif" smileid="114" alt="(bgm98)" />',
      113: '<img src="/img/smiles/tv/74.gif" smileid="113" alt="(bgm97)" />',
      112: '<img src="/img/smiles/tv/73.gif" smileid="112" alt="(bgm96)" />',
      111: '<img src="/img/smiles/tv/72.gif" smileid="111" alt="(bgm95)" />',
      110: '<img src="/img/smiles/tv/71.gif" smileid="110" alt="(bgm94)" />',
      109: '<img src="/img/smiles/tv/70.gif" smileid="109" alt="(bgm93)" />',
      108: '<img src="/img/smiles/tv/69.gif" smileid="108" alt="(bgm92)" />',
      107: '<img src="/img/smiles/tv/68.gif" smileid="107" alt="(bgm91)" />',
      106: '<img src="/img/smiles/tv/67.gif" smileid="106" alt="(bgm90)" />',
      105: '<img src="/img/smiles/tv/66.gif" smileid="105" alt="(bgm89)" />',
      104: '<img src="/img/smiles/tv/65.gif" smileid="104" alt="(bgm88)" />',
      103: '<img src="/img/smiles/tv/64.gif" smileid="103" alt="(bgm87)" />',
      102: '<img src="/img/smiles/tv/63.gif" smileid="102" alt="(bgm86)" />',
      101: '<img src="/img/smiles/tv/62.gif" smileid="101" alt="(bgm85)" />',
      100: '<img src="/img/smiles/tv/61.gif" smileid="100" alt="(bgm84)" />',
      99: '<img src="/img/smiles/tv/60.gif" smileid="99" alt="(bgm83)" />',
      98: '<img src="/img/smiles/tv/59.gif" smileid="98" alt="(bgm82)" />',
      97: '<img src="/img/smiles/tv/58.gif" smileid="97" alt="(bgm81)" />',
      96: '<img src="/img/smiles/tv/57.gif" smileid="96" alt="(bgm80)" />',
      95: '<img src="/img/smiles/tv/56.gif" smileid="95" alt="(bgm79)" />',
      94: '<img src="/img/smiles/tv/55.gif" smileid="94" alt="(bgm78)" />',
      93: '<img src="/img/smiles/tv/54.gif" smileid="93" alt="(bgm77)" />',
      92: '<img src="/img/smiles/tv/53.gif" smileid="92" alt="(bgm76)" />',
      91: '<img src="/img/smiles/tv/52.gif" smileid="91" alt="(bgm75)" />',
      90: '<img src="/img/smiles/tv/51.gif" smileid="90" alt="(bgm74)" />',
      89: '<img src="/img/smiles/tv/50.gif" smileid="89" alt="(bgm73)" />',
      88: '<img src="/img/smiles/tv/49.gif" smileid="88" alt="(bgm72)" />',
      87: '<img src="/img/smiles/tv/48.gif" smileid="87" alt="(bgm71)" />',
      86: '<img src="/img/smiles/tv/47.gif" smileid="86" alt="(bgm70)" />',
      85: '<img src="/img/smiles/tv/46.gif" smileid="85" alt="(bgm69)" />',
      84: '<img src="/img/smiles/tv/45.gif" smileid="84" alt="(bgm68)" />',
      83: '<img src="/img/smiles/tv/44.gif" smileid="83" alt="(bgm67)" />',
      82: '<img src="/img/smiles/tv/43.gif" smileid="82" alt="(bgm66)" />',
      81: '<img src="/img/smiles/tv/42.gif" smileid="81" alt="(bgm65)" />',
      80: '<img src="/img/smiles/tv/41.gif" smileid="80" alt="(bgm64)" />',
      79: '<img src="/img/smiles/tv/40.gif" smileid="79" alt="(bgm63)" />',
      78: '<img src="/img/smiles/tv/39.gif" smileid="78" alt="(bgm62)" />',
      77: '<img src="/img/smiles/tv/38.gif" smileid="77" alt="(bgm61)" />',
      76: '<img src="/img/smiles/tv/37.gif" smileid="76" alt="(bgm60)" />',
      75: '<img src="/img/smiles/tv/36.gif" smileid="75" alt="(bgm59)" />',
      74: '<img src="/img/smiles/tv/35.gif" smileid="74" alt="(bgm58)" />',
      73: '<img src="/img/smiles/tv/34.gif" smileid="73" alt="(bgm57)" />',
      72: '<img src="/img/smiles/tv/33.gif" smileid="72" alt="(bgm56)" />',
      71: '<img src="/img/smiles/tv/32.gif" smileid="71" alt="(bgm55)" />',
      70: '<img src="/img/smiles/tv/31.gif" smileid="70" alt="(bgm54)" />',
      69: '<img src="/img/smiles/tv/30.gif" smileid="69" alt="(bgm53)" />',
      68: '<img src="/img/smiles/tv/29.gif" smileid="68" alt="(bgm52)" />',
      67: '<img src="/img/smiles/tv/28.gif" smileid="67" alt="(bgm51)" />',
      66: '<img src="/img/smiles/tv/27.gif" smileid="66" alt="(bgm50)" />',
      65: '<img src="/img/smiles/tv/26.gif" smileid="65" alt="(bgm49)" />',
      64: '<img src="/img/smiles/tv/25.gif" smileid="64" alt="(bgm48)" />',
      63: '<img src="/img/smiles/tv/24.gif" smileid="63" alt="(bgm47)" />',
      62: '<img src="/img/smiles/tv/23.gif" smileid="62" alt="(bgm46)" />',
      61: '<img src="/img/smiles/tv/22.gif" smileid="61" alt="(bgm45)" />',
      60: '<img src="/img/smiles/tv/21.gif" smileid="60" alt="(bgm44)" />',
      59: '<img src="/img/smiles/tv/20.gif" smileid="59" alt="(bgm43)" />',
      58: '<img src="/img/smiles/tv/19.gif" smileid="58" alt="(bgm42)" />',
      57: '<img src="/img/smiles/tv/18.gif" smileid="57" alt="(bgm41)" />',
      56: '<img src="/img/smiles/tv/17.gif" smileid="56" alt="(bgm40)" />',
      55: '<img src="/img/smiles/tv/16.gif" smileid="55" alt="(bgm39)" />',
      54: '<img src="/img/smiles/tv/15.gif" smileid="54" alt="(bgm38)" />',
      53: '<img src="/img/smiles/tv/14.gif" smileid="53" alt="(bgm37)" />',
      52: '<img src="/img/smiles/tv/13.gif" smileid="52" alt="(bgm36)" />',
      51: '<img src="/img/smiles/tv/12.gif" smileid="51" alt="(bgm35)" />',
      50: '<img src="/img/smiles/tv/11.gif" smileid="50" alt="(bgm34)" />',
      49: '<img src="/img/smiles/tv/10.gif" smileid="49" alt="(bgm33)" />',
      48: '<img src="/img/smiles/tv/09.gif" smileid="48" alt="(bgm32)" />',
      47: '<img src="/img/smiles/tv/08.gif" smileid="47" alt="(bgm31)" />',
      46: '<img src="/img/smiles/tv/07.gif" smileid="46" alt="(bgm30)" />',
      45: '<img src="/img/smiles/tv/06.gif" smileid="45" alt="(bgm29)" />',
      44: '<img src="/img/smiles/tv/05.gif" smileid="44" alt="(bgm28)" />',
      43: '<img src="/img/smiles/tv/04.gif" smileid="43" alt="(bgm27)" />',
      42: '<img src="/img/smiles/tv/03.gif" smileid="42" alt="(bgm26)" />',
      41: '<img src="/img/smiles/tv/02.gif" smileid="41" alt="(bgm25)" />',
      40: '<img src="/img/smiles/tv/01.gif" smileid="40" alt="(bgm24)" />',
      39: '<img src="/img/smiles/bgm/23.gif" smileid="39" alt="(bgm23)" />',
      38: '<img src="/img/smiles/bgm/22.png" smileid="38" alt="(bgm22)" />',
      37: '<img src="/img/smiles/bgm/21.png" smileid="37" alt="(bgm21)" />',
      36: '<img src="/img/smiles/bgm/20.png" smileid="36" alt="(bgm20)" />',
      35: '<img src="/img/smiles/bgm/19.png" smileid="35" alt="(bgm19)" />',
      34: '<img src="/img/smiles/bgm/18.png" smileid="34" alt="(bgm18)" />',
      33: '<img src="/img/smiles/bgm/17.png" smileid="33" alt="(bgm17)" />',
      32: '<img src="/img/smiles/bgm/16.png" smileid="32" alt="(bgm16)" />',
      31: '<img src="/img/smiles/bgm/15.png" smileid="31" alt="(bgm15)" />',
      30: '<img src="/img/smiles/bgm/14.png" smileid="30" alt="(bgm14)" />',
      29: '<img src="/img/smiles/bgm/13.png" smileid="29" alt="(bgm13)" />',
      28: '<img src="/img/smiles/bgm/12.png" smileid="28" alt="(bgm12)" />',
      27: '<img src="/img/smiles/bgm/11.gif" smileid="27" alt="(bgm11)" />',
      26: '<img src="/img/smiles/bgm/10.png" smileid="26" alt="(bgm10)" />',
      25: '<img src="/img/smiles/bgm/09.png" smileid="25" alt="(bgm09)" />',
      24: '<img src="/img/smiles/bgm/08.png" smileid="24" alt="(bgm08)" />',
      23: '<img src="/img/smiles/bgm/07.png" smileid="23" alt="(bgm07)" />',
      22: '<img src="/img/smiles/bgm/06.png" smileid="22" alt="(bgm06)" />',
      21: '<img src="/img/smiles/bgm/05.png" smileid="21" alt="(bgm05)" />',
      20: '<img src="/img/smiles/bgm/04.png" smileid="20" alt="(bgm04)" />',
      19: '<img src="/img/smiles/bgm/03.png" smileid="19" alt="(bgm03)" />',
      18: '<img src="/img/smiles/bgm/02.png" smileid="18" alt="(bgm02)" />',
      17: '<img src="/img/smiles/bgm/01.png" smileid="17" alt="(bgm01)" />',
      16: '<img src="/img/smiles/16.gif" smileid="16" alt="LOL" />',
      15: '<img src="/img/smiles/15.gif" smileid="15" alt=":P" />',
      14: '<img src="/img/smiles/14.gif" smileid="14" alt="=.,=" />',
      13: '<img src="/img/smiles/13.gif" smileid="13" alt="=///=" />',
      12: '<img src="/img/smiles/12.gif" smileid="12" alt="= =\'" />',
      11: '<img src="/img/smiles/11.gif" smileid="11" alt="=3=" />',
      10: '<img src="/img/smiles/10.gif" smileid="10" alt="=\'=" />',
      9: '<img src="/img/smiles/9.gif" smileid="9" alt="T_T" />',
      8: '<img src="/img/smiles/8.gif" smileid="8" alt="TAT" />',
      7: '<img src="/img/smiles/7.gif" smileid="7" alt="=W=" />',
      6: '<img src="/img/smiles/6.gif" smileid="6" alt="@_@" />',
      5: '<img src="/img/smiles/5.gif" smileid="5" alt="=v=" />',
      4: '<img src="/img/smiles/4.gif" smileid="4" alt="S_S" />',
      3: '<img src="/img/smiles/3.gif" smileid="3" alt="-w=" />',
      2: '<img src="/img/smiles/2.gif" smileid="2" alt="=w=" />',
      1: '<img src="/img/smiles/1.gif" smileid="1" alt="=A=" />',
    } as const,
  };

  public static chiicodes = { pcodecount: -1, codecount: 0, codehtml: '', smiliesreplaced: 0 };

  //[code]..[/code]的临时存放区
  private bbcodeCodeArr = {} as Record<number, string>;

  smileReplace() {
    const smiles_list: Record<string, string> = {};

    if (!ChiiCodeCore.chiicodes.smiliesreplaced) {
      for (const [key, smiley] of Object.entries(ChiiCodeCore.smilies_list.replacearray)) {
        smiles_list[key] =
          '<img src="' + IMGDIR + '/smilies/' + smiley + '" smileid="' + key + '" alt="" />';
      }
      chiicode.smiliesreplaced = 1;
    }
    return smiles_list;
  }

  private static matched_domains = /((?:www.)?(bgm\.tv|chii\.in|bangumi\.tv))+/i;
  private static replace_domains = {
    0: 'chii.in',
    1: 'bangumi.tv',
    2: 'www.chii.in',
    3: 'www.bangumi.tv',
    4: 'bgm.tv',
    5: 'www.bgm.tv',
  };

  addLink(str: string): string {
    const domain_replace_regex = /(:\/\/(www|api|lain|doujin)\.)(bgm\.tv)+/i;
    if (ChiiCodeCore.matched_domains.test(str) && !domain_replace_regex.test(str)) {
      conv_url = ChiiCodeCore.replace_domains;
      target_url = Settlement.str_replace({ 0: 'http://', 1: 'https://' }, '', SITE_URL);
      str = Settlement.str_replace(conv_url, target_url, str);
    }
    //preg_match('#https?://[\w-./?%&=~@:$*\\\,+\#]+#i', $str, $m);
    //print_r($str);
    return str.replaceAll(
      /(https?:\/\/[\w-./?%&;=~@:$*\\,+#]+)/g,
      '<a href="$1" class="l" rel="nofollow external noopener noreferrer" target="_blank">$1</a>',
    );
  }

  id = 0;

  parseCode(code: string) {
    this.bbcodeCodeArr[this.id] = code;
    const mark =
      '<div class="codeHighlight"><pre>' + this.genParseCodeMark(this.id) + '</pre></div>';
    this.id++;
    return mark;
  }

  genParseCodeMark(id: string) {
    const mark = '8848213b4dd8e320';
    return `<${mark}#${id}>`;
  }

  cov_code = { open: {}, close: {} };
  convCodeArr: Record<string, string> = {};

  chiicode(
    message: string,
    {
      smileyoff = false,
      bbcodeoff = false,
      htmlon = false,
      allowsmilies = true,
      allowbbcode = true,
      parsetype = false,
      authorid = false,
      allowmediacode = false,
      pid = true,
      filter = false,
    }: Option = {},
  ) {
    const msglower: string = message.toLowerCase();
    let parseCode = false;

    if (!bbcodeoff && allowbbcode) {
      parseCode = false;
      if (msglower.includes('[/code]')) {
        parseCode = true;
        message = message.replaceAll(/\\[code\\](.+)\\[/code\\]/g, this.parseCode);
      }
      if (msglower.includes('[/mask]')) {
        //打码
        message = message.replaceAll(/\[mask](.+)\[\/mask]/g, this.parseMask);
      }
      if (msglower.includes('[/url]')) {
        message = message.replaceAll(
          '/\\[url(=((https?|ftp|gopher|news|telnet|rtsp|mms|callto|bctp|ed2k|thunder|synacast){1}:\\/\\/|www\\.)([^\\["\']+?))?\\](.+?)\\[\\/url\\]/ies',
          this.parseurl,
        );
      }
      if (filter) {
        this.cov_code.open = { 0: '', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
        this.cov_code.close = {
          0: '',
          1: '',
          2: '',
          3: '',
          4: '',
          5: '',
          6: '',
          7: '',
          8: '',
          9: '',
          10: '',
          11: '',
          12: '',
          13: '',
          14: '',
          15: '',
          16: '',
          17: '',
          18: '',
        };
        this.convCodeArr = {
          '[/color]': '',
          '[/size]': '',
          '[b]': '',
          '[/b]': '',
          '[i]': '',
          '[/i]': '',
          '[u]': '',
          '[/u]': '',
          '[s]': '',
          '[/s]': '',
          '[center]': '',
          '[/center]': '',
          '[left]': '',
          '[/left]': '',
          '[right]': '',
          '[/right]': '',
          '[/align]': '',
          '[list]': '',
          '[list=1]': '',
          '[list=a]': '',
          '[list=A]': '',
          '[*]': '',
          '[/list]': '',
          '[indent]': '',
          '[/indent]': '',
          '[/float]': '',
          '[/subject]': '',
        };
      } else {
        /*
                        $cov_code['open'] = array(
           "<span style=\"color: \\1;\">",
           "<span style=\"font-size: \\1pt;\">",
           "<font style=\"font-size: \\1\">",
           "<p align=\"\\1\">",
           "<span style=\"float: \\1;\">",
           "<a href=\"/user/\\1\" class=\"l\">",
           "<a href=\"/subject/\\1\" class=\"l\">",
                        );
                        $cov_code['close'] = array(
           '</span>', '</span>', '</span>', '</p>', '<strong>', '</strong>', '<i class="pstatus">', '<em>',
           '</em>', '<span style="text-decoration: underline;">', '</span>', '<ul>', '<ul type="1" class="litype_1">', '<ul type="a" class="litype_2">',
           '<ul type="A" class="litype_3">', '<li>', '</ul>', '<blockquote>', '</blockquote>', '</span>','</a>'
           );
        */
        this.convCodeArr = {
          '[/color]': '</span>',
          '[/size]': '</span>',
          '[b]': '<span style="font-weight:bold;">',
          '[/b]': '</span>',
          '[i]': '<span style="font-style:italic">',
          '[/i]': '</span>',
          '[u]': '<span style="text-decoration: underline;">',
          '[/u]': '</span>',
          '[s]': '<span style="text-decoration: line-through;">',
          '[/s]': '</span>',
          '[center]': '<p style="text-align: center;">',
          '[/center]': '</p>',
          '[left]': '<p style="text-align: left;">',
          '[/left]': '</p>',
          '[right]': '<p style="text-align: right;">',
          '[/right]': '</p>',
          '[/align]': '</p>',
          '[list]': '<ul>',
          '[list=1]': '<ul type="1" class="litype_1">',
          '[list=a]': '<ul type="a" class="litype_2">',
          '[list=A]': '<ul type="A" class="litype_3">',
          '[*]': '<li>',
          '[/list]': '</ul>',
          '[indent]': '<blockquote>',
          '[/indent]': '</blockquote>',
          '[/float]': '</span>',
          '[/subject]': '</a>',
        };
      }
      /*
                  $message = str_replace(array(
                      '[/color]', '[/size]', '[/size]',  '[/align]', '[b]', '[/b]',
                      '[i=s]', '[i]', '[/i]', '[u]', '[/u]', '[list]', '[list=1]', '[list=a]',
                      '[list=A]', '[*]', '[/list]', '[indent]', '[/indent]', '[/float]','[/user]','[/subject]'
                  ),$cov_code['close'], preg_replace(array(*/
      if (filter) {
        for (const pattern of [
          /\[color=([#\w]+?)]/g,
          /\[size=(\d+?)]/g,
          /\[align=(left|center|right)]/g,
          /\[float=(left|right)]/g,
          /\[subject=(\d+?)]/g,
        ]) {
          message = message.replaceAll(pattern, '');
        }
      } else {
        for (const [pattern, value] of [
          [/\[color=([#\\w]+?)\\]/gi, (m) => `<span style="color: ${m};">`],
          [/\[size=(\\d+?)\\]/gi, (m) => this.fontResize(m, 'px')],
          [/\[align=(left|center|right)\\]/gi, (m) => `<p align="${m}">`],
          [/\[float=(left|right)\\]/gi, (m) => `<span style="float: ${m};">`],
          [/\[subject=(\\d+?)\\]/gi, (m) => `<a href="/subject/${m}" class="l">`],
        ] satisfies [RegExp, (match: string) => string][]) {
          message = message.replaceAll(pattern, value);
        }
      }

      for (const [pattern, value] of Object.entries(this.convCodeArr)) {
        message = message.replaceAll(pattern, value);
      }

      if (!parsetype && msglower.includes('[/quote]')) {
        if (filter) {
          message = message.replaceAll(
            /\s*\[quote][\n\r]*(.+?)[\n\r]*\[\/quote]\s*/gis,
            `<div class="quote"><q>$1</q></div>`,
          );
        } else {
          message = message.replaceAll(/\s*\[quote][\n\r]*(.+?)[\n\r]*\[\/quote]\s*/gis, '$1');
        }
      }
    }
    if (!smileyoff && allowsmilies) {
      for (const key of Object.keys(ChiiCodeCore.smilies_list.searcharray) as unknown as Array<
        keyof typeof ChiiCodeCore.smilies_list.searcharray
      >) {
        message.replaceAll(
          ChiiCodeCore.smilies_list.searcharray[key],
          ChiiCodeCore.smilies_list.replacearray[key],
        );
      }
    }
    if (!bbcodeoff) {
      if (msglower.includes('[/img]') || msglower.includes('[/photo]')) {
        if (!filter) {
          const patterns = {
            0: '/\\[photo=(\\d+)\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/photo\\]/ies',
            1: '/\\[img\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
            2: '/\\[img=(\\d{1,4})[x|\\,](\\d{1,4})\\]\\s*([^\\[\\<\r\n]+?)\\s*\\[\\/img\\]/ies',
          } as const;

          const values = {
            0: (_: string, m1: string, m2: string) =>
              this.insiteurl(m2, `<img src="${PHOTO_URL}/l/%s" class="code" alt="" />`),
            1: (_: string, m1: string, m2: string) =>
              this.bbcodeurl(
                m1,
                '<img src="%s" class="code" rel="noreferrer" referrerpolicy="no-referrer" alt="" />',
              ),
            2: (_: string, m1: string, m2: string, m3: string) =>
              this.bbcodeurl(
                m3,
                `<img width="${m1}" height="${m2}" src="%s" border="0" alt="" class="code" referrerpolicy="no-referrer" />`,
              ),
          };

          for (const i of [0, 1, 2] as const) {
            message = message.replaceAll(patterns[i], values[i]);
          }
        }
      }
      if (msglower.includes('[/user]')) {
        message = message.replaceAll(/\[user=([^\W_]\w*)](.+?)\[\/user]/g, this.parseUsername);

        message = message.replaceAll(
          '/\\[user]([^\\W_][\\w]*)\\[\\/user\\]/iies',
          this.parseUsername,
        );
      }

      if (parseCode) {
        for (const [id, code] of Object.entries(this.bbcodeCodeArr)) {
          message = message.replaceAll(this.genParseCodeMark(id), code);
        }
      }
    }

    if (filter) {
      message.replaceAll('\t', '  ').replaceAll('   ', ' ').replaceAll('  ', '  ');
    } else {
      message
        .replaceAll('\r\n', '<br')
        .replaceAll('\n', '<br>')
        .replaceAll('\t', '&nbsp; &nbsp; &nbsp; &nbsp; ')
        .replaceAll('   ', '&nbsp; &nbsp; &nbsp;')
        .replaceAll('  ', '&nbsp; &nbsp; ');
    }

    return htmlon ? message : message;
  }

  replyTo(str: string) {
    //#\B@([^_][\w]*)\b#
    o = Settlement.preg_replace(
      '#\\B@([^\\W_][\\w]*)\\b#',
      '@<a href="/user/\\1/timeline?type=say" class="l">\\1</a>',
      str,
    );
    return o;
  }

  autoBBCodeMention(str: string) {
    //#\B@([^_][\w]*)\b#
    str = Settlement.preg_replace(
      '/\\[user=([^\\W_][\\w]*)\\](.+?)\\[\\/user\\]/iies',
      "ChiiCodeCore::parseUsername('\\1', '\\2')",
      str,
    );
    str = Settlement.preg_replace(
      '/\\[user]([^\\W_][\\w]*)\\[\\/user\\]/iies',
      "ChiiCodeCore::parseUsername('\\1', '')",
      str,
    );
    return str;
  }

  parseUsername(username, nickname = '', filter = 0) {
    username = Settlement.strtolower(username);
    nickname = trim(nickname);
    if (Settlement.empty(nickname)) {
      if (filter) {
        return '@' + username;
      } else {
        return '<a href="/user/' + username + '" class="l">@' + username + '</a>';
      }
    } else {
      if (filter) {
        return '@' + nickname;
      } else {
        return '<a href="/user/' + username + '" class="l">@' + nickname + '</a>';
      }
    }
  }

  parseurl(url, text, filter) {
    domain_replace_regex = '/(:\\/\\/(www|api|lain|doujin)\\.)?(bgm\\.tv)+/i';
    conv_url = this.replace_domains;
    target_url = Settlement.str_replace({ 0: 'http://', 1: 'https://' }, '', SITE_URL);
    if (
      !url &&
      preg_match(
        '/((https?|ftp|gopher|news|telnet|rtsp|mms|callto|bctp|ed2k|thunder|synacast){1}:\\/\\/|www\\.)[^\\["\']+/i',
        trim(text),
        matches,
      )
    ) {
      url = matches[0];
      length = 65;
      if (url.length > length) {
        text =
          substr(url, 0, Settlement.intval(length * 0.5)) +
          ' ... ' +
          substr(url, -Settlement.intval(length * 0.3));
      }
      if (
        preg_match(this.matched_domains, url, _matches) &&
        !preg_match(domain_replace_regex, url, matches)
      ) {
        url = Settlement.str_replace(conv_url, target_url, url);
        text = Settlement.str_replace(conv_url, target_url, text);
      }
      if (filter) {
        return url;
      } else {
        return (
          '<a href="' +
          (substr(Settlement.strtolower(url), 0, 4) == 'www.' ? 'http://' + url : url) +
          '" target="_blank" rel="nofollow external noopener noreferrer" class="l">' +
          text +
          '</a>'
        );
      }
    } else {
      url = substr(url, 1);
      if (substr(Settlement.strtolower(url), 0, 4) == 'www.') {
        url = 'http://' + url;
      }
      if (!preg_match(domain_replace_regex, url, matches)) {
        url = Settlement.str_replace(conv_url, target_url, url);
        text = Settlement.str_replace(conv_url, target_url, text);
      }
      if (filter) {
        return text + '[' + url + ']';
      } else {
        return (
          '<a href="' +
          url +
          '" target="_blank" rel="nofollow external noopener noreferrer" class="l">' +
          text +
          '</a>'
        );
      }
    }
  }

  parseMask(_: string, content: string) {
    const color = '#555';
    content = content.replaceAll(/\[color=[#\w]+?\]/g, (color) => '[color=' + color + ']');
    if (content.includes('[/size]')) {
      content = content.replaceAll(
        new RegExp('\\[size=(\\d+)](.+)\\[/size]', 'g'),
        (color) => '<span style="font-size:\\1px;background-color:' + color + ';">\\2</span>',
      );
    }
    return (
      '<span style="background-color:' +
      color +
      ';color:' +
      color +
      ';border:1px solid ' +
      color +
      ';">' +
      content +
      '</span>'
    );
  }

  fontResize(size: string, unit = '') {
    if (parseInt(size) >= 50) {
      size = '15';
    }
    return `<span style="font-size:${size}${unit}; line-height:${size}${unit};">`;
  }

  bbcodeurl(url: string, tags) {
    if (/<.+?>/s.test(url)) {
      return ' ' + url;
    } else {
      if (!['http:/', 'https:', 'ftp://', 'rtsp:/', 'mms://'].includes(url.slice(0, 6))) {
        url = 'http://' + url;
      }
      return Settlement.str_replace(
        {
          0: 'submit',
          1: 'logging.php',
          2: 'connect',
          3: 'disconnect',
          4: 'erase',
          5: 'remove',
          6: 'add_related',
          7: 'status/watched',
          8: 'status/watched',
          9: 'status/drop',
          10: 'xss.hk',
        },
        '',
        Settlement.sprintf(tags, url, Settlement.addslashes(url)),
      );
    }
  }

  autoBBcodeUrl(str: string) {
    //把已经加标签的URL全部PAD填充了。。
    paddedStr = Settlement.preg_replace(
      '#\\[(\\w+).+\\[/\\1\\]#Uise',
      "this._sakuyaPad_('\\0')",
      str,
    );
    //这下就可以把PAD之外的URL给提取出来了
    preg_match_all('#https?://[\\w-./?%&=~@:$*\\\\,+\\#<>|!]+#i', paddedStr, _m, 256);
    offsetIncr = 0;
    startPos = 0;
    foreach(_m[0] as _str);
    {
      startPos = _str[1] + offsetIncr;
      str = substr_replace(str, '[url]{_str[0]}[/url]', startPos, _str[0].length);
      //每次替换，都多了[url][/url]，那么后面的URL开始的位置偏移量就多了11
      offsetIncr += 11;
    }
    return str;
  }

  insiteurl(url: string, tag: string) {
    if (/<.+?>/s.test(url)) {
      return '&nbsp;' + url;
    }
    return utils.format(tag, url.replaceAll('submit', '').replaceAll('logging.php', ''));
  }

  highlight(text: string, words: Record<string, string>, prepend: string) {
    text = text.replaceAll('\\"', '"');
    for (const replaceword of Object.values(words)) {
      text = text.replaceAll(replaceword, '<highlight>' + replaceword + '</highlight>');
    }
    return `${prepend}${text}`;
  }
}

import * as utils from 'node:util';
