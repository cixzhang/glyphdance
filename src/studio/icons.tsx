import type { JSX, SVGProps } from 'react';
import {
  ArrowBarLeft,
  ArrowBarRight,
  ArrowLeft,
  ArrowRight,
  Brush,
  Check,
  Clipboard,
  Close,
  ColorsSwatch,
  Copy,
  Download,
  Eraser,
  Grid3x3,
  Image,
  Layout,
  LetterA,
  Minus,
  Pause,
  SprayCan,
  Pipette,
  Play,
  Plus,
  Pointer,
  Potion,
  Redo,
  Sparkles,
  Sun,
  Moon,
  Trash,
  Undo,
  ZoomIn,
  ZoomOut,
} from 'pixelarticons/react';

type IconProps = SVGProps<SVGSVGElement>;
type IconComponent = (props: IconProps) => JSX.Element;

// Pixelarticons are drawn on a strict 24px grid, so they only stay crisp at
// 12px or 24px. Every chrome icon goes through `px`, which pins it to the
// grid and hides it from assistive tech (Astryx buttons carry the label).
function px(Icon: IconComponent, size: 12 | 24 = 12): IconComponent {
  return function PixelIcon(props: IconProps) {
    return <Icon width={size} height={size} aria-hidden="true" {...props} />;
  };
}

// Semantic names for this app. Where pixelarticons has no direct equivalent,
// the substitute is noted:
// - Fill: no paint bucket, so Potion (pouring flask)
// - Line: no diagonal slash, so Minus (straight stroke)
// - Text: no "type" icon, so LetterA (pixel A)
// - Stamp: no rubber stamp, so Image (places picture art)
// - Onion skin: no layers/ghost, so Copy (overlapping frames)
export const IconPlay = px(Play);
export const IconPause = px(Pause);
export const IconSkipBack = px(ArrowBarLeft);
export const IconSkipForward = px(ArrowBarRight);
export const IconStepBack = px(ArrowLeft);
export const IconStepForward = px(ArrowRight);

export const IconSelect = px(Pointer);
export const IconBrush = px(Brush);
export const IconPaint = px(SprayCan);
export const IconEraser = px(Eraser);
export const IconFill = px(Potion);
export const IconLine = px(Minus);
export const IconText = px(LetterA);
export const IconStamp = px(Image);
export const IconEyedropper = px(Pipette);
export const IconUndo = px(Undo);
export const IconRedo = px(Redo);

export const IconCheck = px(Check);
export const IconClose = px(Close);
export const IconPlus = px(Plus);
export const IconMinus = px(Minus);
export const IconSparkles = px(Sparkles);
export const IconPanels = px(Layout);
export const IconOnion = px(Copy);
export const IconDuplicate = px(Clipboard);
export const IconTrash = px(Trash);
export const IconGrid = px(Grid3x3);
export const IconZoomIn = px(ZoomIn);
export const IconZoomOut = px(ZoomOut);
export const IconDownload = px(Download);
export const IconSun = px(Sun);
export const IconMoon = px(Moon);

// Pixelated GitHub mark, drawn on a 16x16 grid to match the pixelarticons
// aesthetic. Octocat silhouette: pointed ears, round head, tentacle body.
export function IconGithub(props: IconProps) {
  // 16x16 pixel map: █ = filled. Based on the GitHub mark silhouette.
  const rows = [
    '                ',
    '  █          █  ',
    '  ██        ██  ',
    '  ███      ███  ',
    '  ████████████  ',
    '   ██████████   ',
    '   ██████████   ',
    '    ████████    ',
    '    ████████    ',
    '    ████████    ',
    '     ██████     ',
    '   ██████████   ',
    '  ███ ████ ███  ',
    '  ██   ██   ██  ',
    '       ██       ',
    '                ',
  ];
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      aria-hidden="true"
      {...props}
    >
      {rows.map((row, y) =>
        [...row].map((ch, x) =>
          ch === '█' ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
