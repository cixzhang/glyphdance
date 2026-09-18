// Studio content library: sprite art (invaders, player ships) and the
// syntax-theme palettes. Sprites are ASCII art; palettes are borrowed from
// popular editor syntax themes. The demo scene is gone — sprites now seed the
// starter document (seed.ts) and will become placeable stamps.

export interface Sprite {
  id: string;
  name: string;
  /** Animation frames — ET sprites have two (leg positions), the player one. */
  frames: string[][];
  /** Optional fixed foreground color (e.g. the yellow comet). If unset,
      the stamp follows its kind's theme color. */
  fg?: string;
  /** Optional fixed background color (e.g. the clouds' blue). If unset,
      the stamp paints with a transparent background. */
  bg?: string;
  /** Optional per-cell colors, parallel to frames: [frame][row][col].
      When present, these override fg/bg for multicolor stamps. */
  fgMap?: string[][][];
  bgMap?: string[][][];
}

/** The invader. Four classic arcade variants, each with a two-frame shuffle. */
export const ET_SPRITES: Sprite[] = [
  {
    id: 'crab',
    name: 'Crab',
    frames: [
      [
        '  ██      ██  ',
        '   ████████   ',
        '  ██████████  ',
        ' ██ ██████ ██ ',
        ' ████████████ ',
        '   ████████   ',
        '  ██  ██  ██  ',
        ' ███      ███ ',
      ],
      [
        '  ██      ██  ',
        '   ████████   ',
        '  ██████████  ',
        ' ██ ██████ ██ ',
        ' ████████████ ',
        '   ████████   ',
        '   ██    ██   ',
        '  ██      ██  ',
      ],
    ],
  },
  {
    id: 'squid',
    name: 'Squid',
    frames: [
      [
        '   ██   ',
        '  ████  ',
        ' ██████ ',
        '██ ██ ██',
        '████████',
        '  █  █  ',
        ' ██  ██ ',
        '██    ██',
      ],
      [
        '   ██   ',
        '  ████  ',
        ' ██████ ',
        '██ ██ ██',
        '████████',
        ' ██  ██ ',
        '█      █',
      ],
    ],
  },
  {
    id: 'octopus',
    name: 'Octopus',
    frames: [
      [
        '    ████    ',
        '  ████████  ',
        ' ██████████ ',
        '██ ██████ ██',
        '████████████',
        '   ██  ██   ',
        '  ██    ██  ',
        ' ██      ██ ',
      ],
      [
        '    ████    ',
        '  ████████  ',
        ' ██████████ ',
        '██ ██████ ██',
        '████████████',
        '  ███  ███  ',
        ' ██      ██ ',
        '█          █',
      ],
    ],
  },
  {
    id: 'ufo',
    name: 'Saucer',
    frames: [
      [
        '     ████     ',
        '   ████████   ',
        '  ██████████  ',
        ' ████████████ ',
        '██████████████',
        '  ██ ██ ██ ██ ',
        '   █ █  █ █   ',
      ],
      [
        '     ████     ',
        '   ████████   ',
        '  ██████████  ',
        ' ████████████ ',
        '██████████████',
        '   █ █  █ █   ',
        '  ██ ██ ██ ██ ',
      ],
    ],
  },
  {
    id: 'ghost',
    name: 'Ghost',
    frames: [
      [
        '   █████   ',
        ' █████████ ',
        '███████████',
        '██  ███  ██',
        '██  ███  ██',
        '███████████',
        '███████████',
        '██ ██ ██ ██',
      ],
      [
        '   █████   ',
        ' █████████ ',
        '███████████',
        '██  ███  ██',
        '██  ███  ██',
        '███████████',
        '███████████',
        ' ██ ██ ██  ',
      ],
    ],
  },
];

// FACES — kaomoji style, safe glyphs only.
export const FACE_SPRITES: Sprite[] = [
  {
    id: 'happy',
    name: 'Happy',
    frames: [['(*^_^*)']],
  },
  {
    id: 'shrug',
    name: 'Shrug',
    frames: [['¯\\_(.)_/¯']],
  },
  {
    id: 'bear',
    name: 'Bear',
    frames: [['()   ()', '( o.o )']],
  },
  {
    id: 'wow',
    name: 'Wow',
    frames: [['\\(°o°)/']],
  },
];

// CRITTERS — oldskool outline + Joan Stark line art.
export const CRITTER_SPRITES: Sprite[] = [
  {
    id: 'cat',
    name: 'Cat',
    frames: [
      [' /\\_/\\ ', '( o.o )', ' > ^ < '],
      [' /\\_/\\ ', '( -.- )', ' > ^ < '],
    ],
  },
  {
    id: 'bird',
    name: 'Bird',
    frames: [
      ['▲'],
      ['▼'],
    ],
  },
  {
    id: 'songbird',
    name: 'Songbird',
    frames: [['   __  ', ' <(o)__', '  \\_)  ']],
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    frames: [['/\\   /\\', '( o.o )', ' \\___/ ']],
  },
  {
    id: 'frog',
    name: 'Frog',
    frames: [
      [' (o) (o) ', '(   ^   )', ' \\_____/ '],
      [' (-) (-) ', '(   ^   )', ' \\_____/ '],
    ],
  },
];

// ITEMS — Stone Story game-sprite method.
export const ITEM_SPRITES: Sprite[] = [
  {
    id: 'sword',
    name: 'Sword',
    frames: [
      [
        '    /\\   ',
        '    ||   ',
        '    ||   ',
        '    ||   ',
        ' --||--  ',
        '    ||   ',
        '    ()   ',
      ],
    ],
  },
  {
    id: 'potion',
    name: 'Potion',
    frames: [
      ['  __  ', '  ||  ', ' /__\\ ', ' |  | ', ' | o| ', ' \\__/ '],
      ['  __  ', '  ||  ', ' /__\\ ', ' | o| ', ' |  | ', ' \\__/ '],
    ],
  },
  {
    id: 'key',
    name: 'Key',
    frames: [
      [
        ' __   ',
        '/  \\  ',
        '|  |  ',
        '\\__/  ',
        ' |    ',
        ' |--  ',
        ' |    ',
      ],
    ],
  },
  {
    id: 'shield',
    name: 'Shield',
    frames: [
      [
        ' _______ ',
        '/       \\',
        '|       |',
        '|   +   |',
        '|       |',
        ' \\     / ',
        '  \\___/  ',
      ],
    ],
  },
];

// NATURE — line art + density shading.
export const NATURE_SPRITES: Sprite[] = [
{
    id: 'snowflake',
    name: 'Snowflake',
    frames: [[
      '  ❄  ',
      ' ❄❄❄ ',
      '❄❄❄❄❄',
      ' ❄❄❄ ',
      '  ❄  ',
    ]],
    fg: '#e8f4ff',
  },
  {
    id: 'snowfall',
    name: 'Snowfall',
    frames: [
      [
        '❄     ',
        '   ❄  ',
        '     ❄',
        '  ❄   ',
        '    ❄ ',
      ],
      [
        '    ❄ ',
        '❄     ',
        '   ❄  ',
        '     ❄',
        '  ❄   ',
      ],
    ],
    fg: '#e8f4ff',
  },
{
    id: 'bloom',
    name: 'Bloom',
    frames: [
      ['       ', '       ', '       ', '  ◎ ◎  ', ' ↓╮◎╭↓ ', '  ↓↓↓  ', '       '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '#ff8a8a', '', '#ff8a8a', '', ''],
        ['', '#4ade80', '#4ade80', '#ff8a8a', '#4ade80', '#4ade80', ''],
        ['', '', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['', '', '', '', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '#2b4a2f', '#2b4a2f', '', '#2b4a2f', '#2b4a2f', ''],
        ['', '', '#2b4a2f', '#2b4a2f', '#2b4a2f', '', ''],
        ['', '', '', '', '', '', ''],
      ],
    ],
  },
  {
    id: 'blossom',
    name: 'Blossom',
    frames: [
      ['  ●●●  ', ' ●×××● ', '  ●●●  ', '   │   ', '   ╭══·', '·══╮   ', '   │   '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '#ffd75e', '#ffd75e', '#ffd75e', '', ''],
        ['', '#ffd75e', '#ff9f5a', '#ff9f5a', '#ff9f5a', '#ffd75e', ''],
        ['', '', '#ffd75e', '#ffd75e', '#ffd75e', '', ''],
        ['', '', '', '#4ade80', '', '', ''],
        ['', '', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '', ''],
        ['', '', '', '#4ade80', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '#4a2b2b', '#4a2b2b', '#4a2b2b', '', ''],
        ['', '#4a2b2b', '#4a2b2b', '#4a2b2b', '#4a2b2b', '#4a2b2b', ''],
        ['', '', '#4a2b2b', '#4a2b2b', '#4a2b2b', '', ''],
        ['', '', '', '#2b4a2f', '', '', ''],
        ['', '', '', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#2b4a2f'],
        ['#2b4a2f', '#2b4a2f', '#2b4a2f', '#2b4a2f', '', '', ''],
        ['', '', '', '#2b4a2f', '', '', ''],
      ],
    ],
  },
  {
    id: 'cloud-left',
    name: 'Cloud ←',
    frames: [
      [
        '       ╭◆◆◆◆╮     ',
        '     ╭✚✚❄❄❄✚◆❄╮   ',
        '     ╰……………………╯   ',
      ],
      [
        '      ╭◆◆◆◆╮      ',
        '    ╭✚✚❄❄❄✚◆❄╮    ',
        '    ╰……………………╯    ',
      ],
    ],
    fg: '#ffffff',
    bg: '#2b3a55',
  },
  {
    id: 'cloud-right',
    name: 'Cloud →',
    frames: [
      [
        '       ╭✚✚✚✚╭✚✚✚╮   ',
        '      ╭✚✚❄❄❄✚❄……❄╮  ',
        '      ╰…………………………╯  ',
      ],
      [
        '        ╭✚✚✚✚╭✚✚✚╮  ',
        '       ╭✚✚❄❄❄✚❄……❄╮ ',
        '       ╰…………………………╯ ',
      ],
    ],
    fg: '#ffffff',
    bg: '#2b3a55',
  },
{
    id: 'sapling',
    name: 'Sapling',
    frames: [
      ['          ', '          ', '          ', '    ↓     ', '   ↓↓↓    ', '  ↓═↓≠    ', '  ╮↓══╭   ', ' ↓═…═≠╭╭  ', '±════ ±╮╮ ', '±±…♩╮±±═± ', '    ♩     ', '    ♩     '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '#4ade80', '', '', '', '', ''],
        ['', '', '', '#4ade80', '#4ade80', '#4ade80', '', '', '', ''],
        ['', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '', '', ''],
        ['', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '', ''],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '#4ade80', '#4ade80', '#4ade80', ''],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '#ff8a8a', '#4ade80', '#4ade80', '#4ade80', '#4ade80', ''],
        ['', '', '', '', '#ff8a8a', '', '', '', '', ''],
        ['', '', '', '', '#ff8a8a', '', '', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '#4a3d1e', '', '', '', '', ''],
        ['', '', '', '#4a3d1e', '#2b4a2f', '#101215', '', '', '', ''],
        ['', '', '#2b4a2f', '#101215', '#2b4a2f', '#101215', '', '', '', ''],
        ['', '', '#4a3d1e', '#4a3d1e', '#4a3d1e', '#101215', '#2b4a2f', '', '', ''],
        ['', '#2b4a2f', '#101215', '#101215', '#101215', '#2b4a2f', '#101215', '#2b4a2f', '', ''],
        ['#2b4a2f', '#4a3d1e', '#101215', '#1d2126', '#101215', '', '#2b4a2f', '#101215', '#1d2126', ''],
        ['#4a3d1e', '#101215', '#101215', '#101215', '#4a2b2b', '#1d2126', '#1d2126', '#101215', '#101215', ''],
        ['', '', '', '', '#4a2b2b', '', '', '', '', ''],
        ['', '', '', '', '#4a2b2b', '', '', '', '', ''],
      ],
    ],
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    frames: [
      ['   ╭═…╮╮  ', '  ╭═…±═╯  ', ' ╭═…│–±╮╮ ', '╭═══╮±±═╯╮', ' –…♩│╮±±═╯', '  ≠═╭═…   ', ' ╭═…═══±╮╮', ' ╭═…–…±±═╯', '╭═══│ ±±╮╮', ' –…♩╮±±±═╯', '    ♩♩    ', '    ♩♩    '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', ''],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '#ff8a8a', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#ff8a8a', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '', ''],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80'],
        ['', '', '', '', '#ff8a8a', '#ff8a8a', '', '', '', ''],
        ['', '', '', '', '#ff8a8a', '#ff8a8a', '', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#1d2126', '#2b4a2f', '', ''],
        ['', '', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#1d2126', '#1d2126', '#1d2126', '', ''],
        ['', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#101215', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#1d2126', ''],
        ['#2b4a2f', '#2b4a2f', '#101215', '#1d2126', '#4a2b2b', '#1d2126', '#2b4a2f', '#1d2126', '#1d2126', '#1d2126'],
        ['', '#2b4a2f', '#101215', '#101215', '#4a2b2b', '#4a2b2b', '#1d2126', '#1d2126', '#1d2126', '#1d2126'],
        ['', '', '#101215', '#101215', '#2b4a2f', '#2b4a2f', '#2b4a2f', '', '', ''],
        ['', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#101215', '#101215', '#1d2126', '#1d2126', '#1d2126'],
        ['', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#2b4a2f', '#101215', '#1d2126', '#1d2126', '#1d2126', '#1d2126'],
        ['#2b4a2f', '#2b4a2f', '#101215', '#1d2126', '#4a2b2b', '', '#2b4a2f', '#1d2126', '#1d2126', '#1d2126'],
        ['', '#2b4a2f', '#101215', '#101215', '#2b4a2f', '#2b4a2f', '#1d2126', '#101215', '#1d2126', '#1d2126'],
        ['', '', '', '', '#4a2b2b', '#4a2b2b', '', '', '', ''],
        ['', '', '', '', '#4a2b2b', '#4a2b2b', '', '', '', ''],
      ],
    ],
  },
  {
    id: 'pine',
    name: 'Pine',
    frames: [
      ['          ', '          ', '          ', '          ', '          ', ' ╭═══╮    ', ' ╭╭≠═══╮  ', '╭═…═≠═╮╮  ', '╭════┐±╮╮ ', ' –…♩╮±±═╯ ', '    ♩     ', '    ♩     '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '#ffd75e', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', '', '', ''],
        ['', '#ffd75e', '#4ade80', '#ffd75e', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '', ''],
        ['#4ade80', '#4ade80', '#ffd75e', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', '#4ade80', ''],
        ['', '#4ade80', '#4ade80', '#4ade80', '#ff8a8a', '#4ade80', '#4ade80', '#4ade80', '#4ade80', ''],
        ['', '', '', '', '#ff8a8a', '', '', '', '', ''],
        ['', '', '', '', '#ff8a8a', '', '', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', ''],
        ['', '#101215', '#2b4a2f', '#101215', '#2b4a2f', '#4a2b2b', '', '', '', ''],
        ['', '#101215', '#101215', '#1d2126', '#2b4a2f', '#4a2b2b', '#2b4a2f', '#4a2b2b', '', ''],
        ['#2b4a2f', '#2b4a2f', '#101215', '#101215', '#101215', '#2b4a2f', '#2b4a2f', '#4a2b2b', '', ''],
        ['#2b4a2f', '#2b4a2f', '#1d2126', '#1d2126', '#2b4a2f', '#2b4a2f', '#101215', '#101215', '#1d2126', ''],
        ['', '#101215', '#101215', '#101215', '#4a2b2b', '#1d2126', '#101215', '#1d2126', '#1d2126', ''],
        ['', '', '', '', '#4a2b2b', '', '', '', '', ''],
        ['', '', '', '', '#4a2b2b', '', '', '', '', ''],
      ],
    ],
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    frames: [
      ['       ', '       ', '       ', '       ', '       ', '  ╭─╮  ', '   ║   '],
    ],
    fg: '#4ade80',
    bg: '#2b4a2f',
    fgMap: [
      [
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '#ff8a8a', '#ff8a8a', '#ff8a8a', '', ''],
        ['', '', '', '#d7dce2', '', '', ''],
      ],
    ],
    bgMap: [
      [
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '', '', '', '', ''],
        ['', '', '#4a2b2b', '#4a2b2b', '#4a2b2b', '', ''],
        ['', '', '', '#4a2b2b', '', '', ''],
      ],
    ],
  },
];

// OBJECTS — box-drawing style.

/** The comet: yellow diamond with a trailing mote tail, 8-frame clockwise
    loop. Generated (not hand-drawn) so the orbit stays smooth. */
function cometFrames(): string[][] {
  const S = 13; // grid size
  const C = 6; // center
  const R = 5; // orbit radius
  const FOLLOW = ['·', '.', '*', '°'];
  const frames: string[][] = [];
  for (let f = 0; f < 8; f++) {
    const grid: string[][] = Array.from({ length: S }, () => Array(S).fill(' '));
    const leaderAngle = -Math.PI / 2 + (f / 8) * Math.PI * 2;
    // Followers trail behind the diamond: dense near it, loose at the tip.
    for (let i = 7; i >= 1; i--) {
      const lag = 0.22 * i + Math.sin(f * 0.7 + i * 2.1) * 0.05 * i;
      const angle = leaderAngle - lag;
      const rj = Math.sin(f * 0.9 + i * 1.7) * (0.4 + i * 0.2);
      const x = Math.round(C + Math.cos(angle) * (R + rj));
      const y = Math.round(C + Math.sin(angle) * (R + rj));
      if (x >= 0 && x < S && y >= 0 && y < S && grid[y][x] === ' ') {
        const pulse = Math.sin(f * 1.1 + i * 2.3) > 0 ? 1 : 0;
        grid[y][x] = FOLLOW[Math.max(0, Math.min(3, 2 - Math.floor(i / 3) + pulse))];
      }
    }
    const dx = Math.round(C + Math.cos(leaderAngle) * R);
    const dy = Math.round(C + Math.sin(leaderAngle) * R);
    if (dx >= 0 && dx < S && dy >= 0 && dy < S) grid[dy][dx] = '◆';
    frames.push(grid.map((row) => row.join('')));
  }
  return frames;
}

export const OBJECT_SPRITES: Sprite[] = [
  {
    id: 'robot',
    name: 'Robot',
    frames: [
      [
        '   │   ',
        '   o   ',
        '┌─────┐',
        '│ o o │',
        '│ \\_/ │',
        '└─────┘',
      ],
    ],
  },
  {
    id: 'mug',
    name: 'Mug',
    frames: [
      [
        '  ~  ~   ',
        '┌─────┐  ',
        '│     │╭╮',
        '│     │││',
        '└─────┘╰╯',
      ],
    ],
  },
  {
    id: 'tv',
    name: 'TV',
    frames: [
      [
        '  \\     /  ',
        '   \\   /   ',
        '┌─────────┐',
        '│ ┌───┐   │',
        '│ │   │ o │',
        '│ └───┘   │',
        '└─────────┘',
      ],
    ],
  },
  {
    id: 'chest',
    name: 'Chest',
    frames: [
      [
        '╭─────────╮',
        '│         │',
        '├────┬────┤',
        '│    │    │',
        '│    │    │',
        '╰────┴────╯',
      ],
    ],
  },
  {
    id: 'comet',
    name: 'Comet',
    frames: cometFrames(),
    fg: '#f1fa8c',
  },
];


export interface ThemeSwatch {
  bg: string;
  dot: string;
  invader: string;
  player: string;
  star: string;
}

export interface SyntaxTheme {
  id: string;
  name: string;
  /** The palette follows the studio's light/dark mode. `light` uses the
      official light variant where one exists (Solarized Light, Tokyo Night
      Light, One Light, Nord Snow Storm); Dracula and Monokai light are
      crafted in-theme. */
  dark: ThemeSwatch;
  light: ThemeSwatch;
}

/** Palettes borrowed from popular editor syntax themes. */
export const SYNTAX_THEMES: SyntaxTheme[] = [
  {
    id: 'dracula',
    name: 'Dracula',
    dark: { bg: '#282a36',
      dot: '#44475a',
      invader: '#50fa7b',
      player: '#ff79c6',
      star: '#f8f8f2' },
    light: { bg: '#f7f5fb',
      dot: '#d2cde2',
      invader: '#1e8a4d',
      player: '#c2145f',
      star: '#4e4865' },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    dark: { bg: '#272822',
      dot: '#49483e',
      invader: '#a6e22e',
      player: '#f92672',
      star: '#f8f8f2' },
    light: { bg: '#faf8f1',
      dot: '#d9d1ba',
      invader: '#7c9a06',
      player: '#d41e5c',
      star: '#6b6350' },
  },
  {
    id: 'nord',
    name: 'Nord',
    dark: { bg: '#2e3440',
      dot: '#4c566a',
      invader: '#a3be8c',
      player: '#ebcb8b',
      star: '#c7d0e1' },
    light: { bg: '#eceff4',
      dot: '#c7d0e1',
      invader: '#4f7d46',
      player: '#9d6f1e',
      star: '#4c566a' },
  },
  {
    id: 'solarized',
    name: 'Solarized',
    dark: { bg: '#002b36',
      dot: '#2d4a52',
      invader: '#859900',
      player: '#b58900',
      star: '#839496' },
    light: { bg: '#fdf6e3',
      dot: '#e2d8bf',
      invader: '#859900',
      player: '#dc322f',
      star: '#586e75' },
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    dark: { bg: '#1a1b26',
      dot: '#3b4261',
      invader: '#9ece6a',
      player: '#f7768e',
      star: '#c0caf5' },
    light: { bg: '#d5d6db',
      dot: '#aeb0bb',
      invader: '#587539',
      player: '#8c4351',
      star: '#343b58' },
  },
  {
    id: 'onedark',
    name: 'One Dark',
    dark: { bg: '#282c34',
      dot: '#3e4451',
      invader: '#98c379',
      player: '#e06c75',
      star: '#abb2bf' },
    light: { bg: '#fafafa',
      dot: '#d7d7da',
      invader: '#50a14f',
      player: '#e45649',
      star: '#383a42' },
  },
];

/** Look up a palette by id; falls back to the first theme. */
export function themeById(id: string): SyntaxTheme {
  return SYNTAX_THEMES.find((t) => t.id === id) ?? SYNTAX_THEMES[0];
}

/** Look up a sprite by id; falls back to the first sprite in the list. */
export function spriteById(list: Sprite[], id: string): Sprite {
  return list.find((s) => s.id === id) ?? list[0];
}

// [row, col] star positions for the seed scene; twinkle is a deterministic
// function of the frame index.
export const STARS: Array<[number, number]> = [
  [0, 2],
  [0, 20],
  [1, 22],
  [3, 1],
  [5, 20],
  [7, 21],
  [11, 3],
  [11, 8],
  [11, 21],
  [12, 11],
  [12, 15],
  [13, 6],
  [13, 17],
];
