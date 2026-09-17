// Studio content library: sprite art (invaders, player ships) and the
// syntax-theme palettes. Sprites are ASCII art; palettes are borrowed from
// popular editor syntax themes. The demo scene is gone — sprites now seed the
// starter document (seed.ts) and will become placeable stamps.

export interface Sprite {
  id: string;
  name: string;
  /** Animation frames — ET sprites have two (leg positions), the player one. */
  frames: string[][];
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
];

/** The player. Little ships, one frame each. */
export const PLAYER_SPRITES: Sprite[] = [
  {
    id: 'dart',
    name: 'Dart',
    frames: [
      ['   █   ', '  ███  ', ' █████ ', '██ █ ██'],
    ],
  },
  {
    id: 'rocket',
    name: 'Rocket',
    frames: [
      ['  █  ', ' ███ ', ' ███ ', '█████', ' █ █ ', ' █ █ '],
    ],
  },
  {
    id: 'dish',
    name: 'Dish',
    frames: [
      ['     ███     ', '  █████████  ', '█████████████'],
    ],
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
