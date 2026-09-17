// glyphs.ts — what the canvas font can actually draw.
//
// SUPPORTED_GLYPHS is generated from the real Cozette cmap
// (src/assets/fonts/cozette.ttf): every printable ASCII character (U+0020–
// U+007E) plus every non-ASCII codepoint the font covers. To regenerate:
//   python3 -c "from fontTools.ttLib import TTFont; ..."  (see commit history)
// Anything NOT in this string renders as an empty box (tofu) on the canvas.
//
// The action layer (actions.ts) rejects addStamp/paintCells payloads using
// characters outside this set, and the text tool filters them out of the
// input so the field and the grid never disagree.

/** Every character the canvas font can draw (space included). */
export const SUPPORTED_GLYPHS =
  ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƠơƢƣƤƥƦƧƨƩƪƫƬƭƮƯưƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǍǎǏǐǑǒǓǔǕǖǗǘǙǚǛǜǝǞǟǠǡǢǣǤǥǦǧǨǩǪǫǬǭǮǯǰǴǵǶǷǸǹǺǻǼǽǾǿȀȁȂȃȄȅȆȇȈȉȊȋȌȍȎȏȐȑȒȓȔȕȖȗȘșȚțȜȝȞȟȠȤȥȦȧȨȩȫȭȮȯȱȲȳɁɂɆɇɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʔʕʖʗʘʙʚʛʜʝʞʟʠʡʢʹʺʻʼʽ˂˃˄˅ˆˇˈˉˊˋˌˍˎˏːˑ˒˓˔˕˖˗˘˙˚˛˜˝˟ˠˡˢˣˤˬ˭˯˰˱˲˳˴˵˶˷˹˺˻˼˽˾̧̨̛̖̗̘̙̜̝̞̟̠̣̤̥̦̩̪̫̬̭̮̯̰̱̲̳̺̻̼͇͈̀́̂̃̄̅̆̇̈̉̊̋̌̍̎̏̐̑̒̓̔̽̾̿̀́͂̓͆̕̚ΆΈΉΊΌΎΏΐΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΪΫάέήίΰαβγδεζηθικλμνξοπρςστυφχψωϊϋόύώϕϚϛϜϝϴϷϸϹЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюяѐёђѓєѕіїјљњћќѝўџѠѡѢѣѤѥѦѧѨѩѪѫѬѭѮѯѰѱѲѳѴѵѶѷѸѹѺѻѼѽѾѿҀҁ҂ҊҋҌҍҎҏҐґҒғҔҕҖҗҘҙҚқҜҝҞҟҠҡҢңҤҥҦҧҨҩҪҫҬҭҮүҰұҲҳҴҵҶҷҸҹҺһҼҽҾҿӀӁӂӃӄӅӆӇӈӉӊӋӌӍӎӏӐӑӒӓӔӕӖӗӘәӚӛӜӝӞӟӠӡӢӣӤӥӦӧӨөӪӫӬӭӮӯӰӱӲӳӴӵӶӷӸӹӺӻӼӽӾӿԀԁԂԃԄԅԆԇԈԉԊԋԌԍԎԏԐԑԒԓԔԕԖԗԘԙԚԛԜԝԞԟԠԡԢԣԤԥԦԧԨԩԪԫԬԭԮԯᚠᚢᚣᚤᚥᚦᚨᚩᚪᚫᚬḀḁḂḃḄḅḆḇḈḉḊḋḌḍḎḏḐḑḒḓḔḕḖḗḘḙḚḛḜḝḞḟḠḡḢḣḤḥḦḧḨḩḪḫḬḭḮḯḰḱḲḳḴḵḶḷḸḹḺḻḼḽḾḿṀṁṂṃṄṅṆṇṈṉṊṋṌṍṎṏṐṑṒṓṔṕṖṗṘṙṚṛṜṝṞṟṠṡṢṣṤṥṦṧṨṩṪṫṬṭṮṯṰṱṲṳṴṵṶṷṸṹṺṻṼṽṾṿẀẁẂẃẄẅẆẇẈẉẊẋẌẍẎẏẐẑẒẓẔẕẖẗẘẙẚẛẜẝẞẟẠạẢảẤấẦầẪẫẬậẮắẰằẲẳẴẵẶặẸẹẺẻẼẽẾếỀềỄễỆệỈỉỊịỌọỎỏỐốỒồỖỗỘộỚớỜờỞởỠỡỢợỤụỦủỨứỪừỬửỮữỰựỲỳỴỵỶỷỸỹἀἁἂἃἄἅἈἉἊἋἌἍἐἑἒἓἔἕἘἙἚἛἜἝἠἡἢἣἤἥἨἩἪἫἬἭἰἱἲἳἴἵἸἹἺἻἼἽὀὁὂὃὄὅὈὉὊὋὌὍὐὑὒὓὔὕὙὛὝὠὡὢὣὤὥὨὩὪὫὬὭὰάὲέὴήὶίὸόὺύὼώᾀᾁᾂᾃᾄᾅᾈᾉᾊᾋᾌᾍᾐᾑᾒᾓᾔᾕᾘᾙᾚᾛᾜᾝᾠᾡᾢᾣᾤᾥᾨᾩᾪᾫᾬᾭᾰᾱᾲᾳᾴᾶᾷᾸᾹᾺΆᾼῂῃῄῆῇῈΈῊΉῌῐῑῒΐῖῗῘῙῚΊῠῡῢΰῤῥῦῨῩῪΎῬῲῳῴῶῷῸΌῺΏῼ           ‐‑‒–—―‖‗‘’‚‛“”„‟†‡•‣․‥…‧ ‰′″‴‵‶‷‸‹›※‼‽‾⁃⁄⁅⁆⁖⁘⁙⁚⁛⁜⁝⁞⁰ⁱ⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓₔₕₖₗₘₙₚₛₜ₤₪€₽₿№™ⅠⅡⅢⅣⅤⅥⅨⅩⅪⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻ←↑→↓↔↕↖↗↘↙↚↛↢↣↤↥↦↧↩↪↫↬↰↱↲↳↴↵↶↷↸↺↻↼↽↾↿⇀⇁⇂⇃⇋⇌⇐⇑⇒⇓⇔⇕⇠⇡⇢⇣⇱⇲∀∃∄∅∆∇∈∉∊∋∌∍∎∏∐∑−∓∗∘∙√∞∥∦∫∬∭≈≉≠≡≤≥⊝⊞⊟⊡⊲⊳⊴⊵⋄⋅⋆⋮⋯⋰⋱⌀⌂⌈⌉⌊⌋⌌⌍⌎⌏⌘⌜⌝⌞⌟⌠⌡〈〉⍟⍿⎇⎈⏎⏏⏨⏳⏴⏵⏶⏷⏸⏹⏺⏻⏼␀␈␊␋␌␍␎␤─━│┃┄┅┆┇┈┉┊┋┌┍┎┏┐┑┒┓└┕┖┗┘┙┚┛├┝┞┟┠┡┢┣┤┥┦┧┨┩┪┫┬┭┮┯┰┱┲┳┴┵┶┷┸┹┺┻┼┽┾┿╀╁╂╃╄╅╆╇╈╉╊╋╌╍╎╏═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╧╨╩╪╫╬╭╮╯╰╱╲╳╴╵╶╷╸╹╺╻╼╽╾╿▀▁▂▃▄▅▆▇█▉▊▋▌▍▎▏▐░▒▓▖▗▘▙▚▛▜▝▞▟■□▢▣▪▫▲▶▼◀◆◇◈◉○◎●◐◑◒◓◔◕◰◱◲◳◴◵◶◷☁☃☐☑☒☕☰☱☲☳☴☵☶☷☸☺☻☿♠♡♢♣♤♥♦♧♩♪♫♬♭♮♯⚐⚑⚙⚠⚡⚸✓✔✕✖✗✘✙✚✛✜✦✭✮✹❄❎❬❭❮❯➜⟦⟧⟨⟩⟪⟫⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⡀⡁⡂⡃⡄⡅⡆⡇⡈⡉⡊⡋⡌⡍⡎⡏⡐⡑⡒⡓⡔⡕⡖⡗⡘⡙⡚⡛⡜⡝⡞⡟⡠⡡⡢⡣⡤⡥⡦⡧⡨⡩⡪⡫⡬⡭⡮⡯⡰⡱⡲⡳⡴⡵⡶⡷⡸⡹⡺⡻⡼⡽⡾⡿⢀⢁⢂⢃⢄⢅⢆⢇⢈⢉⢊⢋⢌⢍⢎⢏⢐⢑⢒⢓⢔⢕⢖⢗⢘⢙⢚⢛⢜⢝⢞⢟⢠⢡⢢⢣⢤⢥⢦⢧⢨⢩⢪⢫⢬⢭⢮⢯⢰⢱⢲⢳⢴⢵⢶⢷⢸⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣈⣉⣊⣋⣌⣍⣎⣏⣐⣑⣒⣓⣔⣕⣖⣗⣘⣙⣚⣛⣜⣝⣞⣟⣠⣡⣢⣣⣤⣥⣦⣧⣨⣩⣪⣫⣬⣭⣮⣯⣰⣱⣲⣳⣴⣵⣶⣷⣸⣹⣺⣻⣼⣽⣾⣿⬢⭐⭠⭡⭢⭣⭤⭥⭦⭧⭨⭩⮀⮁⮂⮃⸽㏑Ꞩ墳奄奔婢直睊襁謹ﯱﰮﱛﱜﱝﳌﳤﴃﴅﴆﴇﴈﴉﴊﴋﴌﴍﴎﴏﴐﴲ﵂﹔﹕﹖﹗﹘﹙﹚﹛﹜﹝﹞﹟﹠﹡﹢﹣﹤﹥﹦﹨﹩﹪﹫';

/** True for every character the canvas font can draw. */
export function isSupportedGlyph(ch: string): boolean {
  return SUPPORTED_GLYPHS.includes(ch);
}

/**
 * The agent's working palette: a curated, readable subset of
 * SUPPORTED_GLYPHS shown in the prompt. The font also draws all standard
 * ASCII letters, digits, and punctuation — the palette is guidance, not
 * the limit.
 */
export const PALETTE =
  '█ ▓ ▒ ░ · ● ◆ ✦ ◉ ❄ ♥ ♦ ♣ ♠ ▲ ▼ ◀ ▶ ✚ ♪ ♫ + × * / \\ | - _ ^ ~ = : ; ! ? % $ ( ) [ ] < > o O # @';

/**
 * Map free text to drawable text: drop characters the font can't draw.
 * Returns the filtered text plus the caret (a UTF-16 offset, as from
 * selectionStart) mapped through the filtering so it still points at the
 * same logical position.
 */
export function toSupportedText(
  value: string,
  caret: number,
): { text: string; caret: number } {
  const cps = [...value];
  const caretCp = [...value.slice(0, caret)].length;
  let text = '';
  let keptBeforeCaret = 0;
  cps.forEach((ch, i) => {
    if (isSupportedGlyph(ch)) {
      text += ch;
      if (i < caretCp) keptBeforeCaret += 1;
    }
  });
  const caret16 = [...text].slice(0, keptBeforeCaret).join('').length;
  return { text, caret: caret16 };
}
