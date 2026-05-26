import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const colors = {
  bg: '#0d1117',
  ink: '#f2ead8',
  muted: '#a9b0bb',
  paper: '#d8c7a2',
  red: '#b7332f',
  blue: '#4f7cac',
  gold: '#c49a53',
};

type Beat = {
  from: number;
  duration: number;
  kicker: string;
  title: string;
  caption: string;
  kind: 'modern' | 'archive' | 'split' | 'triangle' | 'close';
  image?: string;
  imageLabel?: string;
};

const beats: Beat[] = [
  {
    from: 0,
    duration: 210,
    kicker: 'COLD OPEN',
    title: 'This looks familiar. That is the trap.',
    caption: "Some photographs arrive already wearing someone else's memory.",
    kind: 'modern',
  },
  {
    from: 210,
    duration: 300,
    kicker: 'BEIJING / MAY 13, 2026',
    title: 'An American president lands in China. The old comparison appears instantly.',
    caption:
      'When President Donald Trump landed in Beijing in May 2026, the comparison was almost too tempting.',
    kind: 'modern',
  },
  {
    from: 510,
    duration: 300,
    kicker: 'ARCHIVAL ECHO',
    title: 'For Americans, there is one obvious template.',
    caption:
      'For many Americans, there is only one historical template for that image: Richard Nixon in 1972.',
    kind: 'archive',
    image: 'assets/nixon-arrival.jpg',
    imageLabel: 'NIXON ARRIVES IN CHINA / 1972',
  },
  {
    from: 810,
    duration: 300,
    kicker: 'THE FAMOUS PHRASE',
    title: 'Nixon goes to China. A door opens. The world changes.',
    caption:
      'Nixon goes to China. The old enemy becomes a partner. A door opens. The world changes.',
    kind: 'archive',
    image: 'assets/nixon-zhou-handshake.jpg',
    imageLabel: 'NIXON AND ZHOU ENLAI / PEKING',
  },
  {
    from: 1110,
    duration: 300,
    kicker: 'THE WRONG LESSON',
    title: 'A famous photograph can teach us to look at the wrong thing.',
    caption:
      'But the danger of a famous photograph is that it teaches us to look for the wrong thing.',
    kind: 'split',
  },
  {
    from: 1410,
    duration: 300,
    kicker: 'SURFACE VS STRUCTURE',
    title: 'It looked like a sequel. Underneath, the structure reversed.',
    caption:
      "Trump's China visit looked, on the surface, like a Nixon sequel. But underneath the image, the structure was almost the opposite.",
    kind: 'split',
  },
  {
    from: 1710,
    duration: 390,
    kicker: '1972: THE TRIANGLE',
    title: 'Washington and Beijing both feared a third power.',
    caption:
      'Nixon went to China because Washington and Beijing both feared a third power more than they feared each other: the Soviet Union.',
    kind: 'triangle',
  },
  {
    from: 2100,
    duration: 330,
    kicker: '2026: NO SOVIET SHADOW',
    title: 'No equivalent force pulls the two sides together.',
    caption:
      'Trump went to China in a world where there is no equivalent Soviet shadow pulling the two sides together.',
    kind: 'triangle',
  },
  {
    from: 2430,
    duration: 270,
    kicker: 'NOT NIXON 2.0',
    title: 'The photograph may echo. The structure has reversed.',
    caption:
      'The handshake may rhyme. The photograph may echo. But the strategic music is in a different key.',
    kind: 'close',
  },
];

const fade = (frame: number, duration: number) => {
  const inOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outOpacity = interpolate(frame, [duration - 20, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.min(inOpacity, outOpacity);
};

const Grain: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity: 0.16,
      backgroundImage:
        'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)',
      mixBlendMode: 'screen',
    }}
  />
);

const NewsTexture: React.FC<{localFrame: number}> = ({localFrame}) => {
  const drift = interpolate(localFrame, [0, 300], [0, -90], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'extend',
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 28% 30%, rgba(183,51,47,0.24), transparent 25%), radial-gradient(circle at 74% 50%, rgba(79,124,172,0.18), transparent 28%), linear-gradient(135deg, #111722, #07090d 65%, #17120d)',
        }}
      />
      {[0, 1, 2, 3].map((row) => (
        <div
          key={row}
          style={{
            position: 'absolute',
            left: 130 + row * 36,
            right: 100,
            top: 110 + row * 150 + drift,
            height: 96,
            borderTop: `1px solid rgba(242,234,216,${0.18 - row * 0.02})`,
            borderBottom: `1px solid rgba(242,234,216,${0.1 - row * 0.01})`,
            transform: `rotate(${-3 + row * 1.6}deg)`,
            color: 'rgba(242,234,216,0.18)',
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            fontSize: 54,
            letterSpacing: 0,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          BEIJING SUMMIT  •  TRADE  •  TAIWAN  •  TECHNOLOGY  •  GREAT POWER RISK
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          right: 150,
          top: 120,
          width: 520,
          height: 630,
          border: '1px solid rgba(216,199,162,0.24)',
          background:
            'linear-gradient(180deg, rgba(216,199,162,0.12), rgba(0,0,0,0.2)), repeating-linear-gradient(90deg, rgba(242,234,216,0.04) 0 2px, transparent 2px 24px)',
          boxShadow: '0 28px 70px rgba(0,0,0,0.42)',
          transform: `translateY(${interpolate(localFrame, [0, 300], [20, -16])}px) rotate(1deg)`,
        }}
      >
        <div
          style={{
            margin: 32,
            border: '1px solid rgba(242,234,216,0.28)',
            height: 360,
            background:
              'radial-gradient(circle at 50% 30%, rgba(242,234,216,0.22), transparent 14%), linear-gradient(22deg, transparent 47%, rgba(242,234,216,0.2) 48%, rgba(242,234,216,0.2) 50%, transparent 51%)',
          }}
        />
        <div style={{margin: '0 32px', color: colors.paper, font: '700 22px ui-monospace, monospace'}}>
          ARRIVAL CEREMONY / PLACEHOLDER
        </div>
      </div>
    </AbsoluteFill>
  );
};

const modernImages = [
  'assets/trump-arrival.jpg',
  'assets/trump-flags.jpg',
  'assets/trump-handshake.jpg',
  'assets/trump-ceremony.jpg',
];

const modernClips = [
  'assets/trump-arrival-clip.mp4',
  'assets/trump-ceremony-clip.mp4',
  'assets/trump-handshake-clip.mp4',
];

const ModernMontage: React.FC<{localFrame: number; compact?: boolean}> = ({localFrame, compact}) => {
  const slotLength = compact ? 54 : 72;
  const slot = Math.floor(localFrame / slotLength);
  const slotFrame = localFrame % slotLength;
  const useVideo = !compact || slot % 2 === 0;
  const clip = modernClips[slot % modernClips.length];
  const image = modernImages[slot % modernImages.length];
  const scale = interpolate(slotFrame, [0, slotLength], [1.02, 1.08]);
  const flash = interpolate(slotFrame, [0, 5, 12], [0.45, 0, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: '#07090d'}}>
      {useVideo ? (
        <Video
          key={clip}
          src={staticFile(clip)}
          muted
          volume={0}
          startFrom={Math.min(95, slotFrame)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'contrast(1.05) brightness(0.7) saturate(0.9)',
            transform: `scale(${scale}) translateX(${slot % 2 === 0 ? -10 : 10}px)`,
          }}
        />
      ) : (
        <Img
          src={staticFile(image)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'contrast(1.04) brightness(0.72) saturate(0.88)',
            transform: `scale(${scale}) translateX(${slot % 2 === 0 ? -14 : 14}px)`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.12) 48%, rgba(0,0,0,0.58)), linear-gradient(0deg, rgba(0,0,0,0.76), transparent 42%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'white',
          opacity: flash,
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 88,
          top: 72,
          color: colors.paper,
          font: '800 21px ui-monospace, monospace',
          letterSpacing: '0.08em',
          border: '1px solid rgba(216,199,162,0.42)',
          padding: '10px 14px',
          background: 'rgba(3,6,10,0.56)',
        }}
      >
        OFFICIAL WHITE HOUSE VIDEO / DRAFT
      </div>
      <div
        style={{
          position: 'absolute',
          left: 88,
          bottom: 198,
          display: 'flex',
          gap: 12,
        }}
      >
        {['ARRIVAL', 'CAMERAS', 'FLAGS', 'RITUAL'].map((item, index) => (
          <div
            key={item}
            style={{
              color: colors.ink,
              background: index === slot % 4 ? 'rgba(183,51,47,0.52)' : 'rgba(5,8,13,0.62)',
              border: '1px solid rgba(242,234,216,0.22)',
              padding: '9px 12px',
              font: '900 18px ui-monospace, monospace',
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ArchiveImage: React.FC<{beat: Beat; localFrame: number}> = ({beat, localFrame}) => {
  const scale = interpolate(localFrame, [0, beat.duration], [1.03, 1.14]);
  const x = interpolate(localFrame, [0, beat.duration], [-18, 18]);
  return (
    <AbsoluteFill style={{background: '#090b0f'}}>
      <Img
        src={staticFile(beat.image ?? '')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'sepia(0.4) contrast(0.92) brightness(0.68)',
          transform: `scale(${scale}) translateX(${x}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.62)), linear-gradient(0deg, rgba(0,0,0,0.7), transparent 35%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 90,
          top: 78,
          color: colors.paper,
          font: '700 22px ui-monospace, monospace',
          letterSpacing: '0.08em',
          border: '1px solid rgba(216,199,162,0.4)',
          padding: '10px 14px',
          background: 'rgba(0,0,0,0.36)',
        }}
      >
        {beat.imageLabel}
      </div>
    </AbsoluteFill>
  );
};

const SplitScreen: React.FC<{localFrame: number}> = ({localFrame}) => {
  const reveal = spring({frame: localFrame, fps: 30, config: {damping: 30, stiffness: 80}});
  return (
    <AbsoluteFill style={{background: colors.bg}}>
      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr'}}>
        <div style={{position: 'relative', overflow: 'hidden', borderRight: '2px solid rgba(183,51,47,0.65)'}}>
          <Img
            src={staticFile('assets/nixon-zhou-handshake.jpg')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'sepia(0.45) contrast(0.9) brightness(0.62)',
              transform: `scale(${1.12 + reveal * 0.04}) translateX(${20 - reveal * 24}px)`,
            }}
          />
          <Label text="1972 / HISTORICAL ECHO" side="left" />
        </div>
        <div style={{position: 'relative', overflow: 'hidden'}}>
          <ModernMontage localFrame={localFrame} compact />
          <Label text="2026 / MODERN RHYME" side="right" />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 92,
          bottom: 92,
          left: '50%',
          width: 5,
          transform: `translateX(-50%) skewX(-9deg) scaleY(${reveal})`,
          background: `linear-gradient(${colors.red}, transparent, ${colors.blue})`,
          boxShadow: '0 0 34px rgba(183,51,47,0.6)',
        }}
      />
    </AbsoluteFill>
  );
};

const Label: React.FC<{text: string; side: 'left' | 'right'}> = ({text, side}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 70,
      [side]: 70,
      color: colors.paper,
      font: '800 24px ui-monospace, monospace',
      letterSpacing: '0.06em',
      background: 'rgba(4,7,11,0.74)',
      borderLeft: `4px solid ${side === 'left' ? colors.gold : colors.blue}`,
      padding: '14px 18px',
    }}
  >
    {text}
  </div>
);

const Triangle: React.FC<{localFrame: number; second?: boolean}> = ({localFrame, second}) => {
  const p = spring({frame: localFrame, fps: 30, config: {damping: 28, stiffness: 70}});
  const fadeSoviet = second ? interpolate(localFrame, [40, 120], [1, 0.16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #09111b, #11151c 58%, #14100e)'}}>
      <div
        style={{
          position: 'absolute',
          inset: 72,
          border: '1px solid rgba(242,234,216,0.18)',
          backgroundImage:
            'linear-gradient(rgba(242,234,216,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(242,234,216,0.04) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <Line x={450} y={660} width={820} rotate={second ? 0 : 0} progress={p} color={second ? colors.red : 'rgba(242,234,216,0.62)'} thick={second ? 7 : 3} />
      <Line x={500} y={610} width={475} rotate={-36} progress={p} color={colors.red} opacity={fadeSoviet} />
      <Line x={1030} y={350} width={420} rotate={38} progress={p} color={colors.red} opacity={fadeSoviet} />
      <Node x={355} y={585} label="U.S." color={colors.blue} />
      <Node x={1310} y={585} label="CHINA" color={colors.red} />
      <Node x={865} y={190} label={second ? 'NO SHARED ENEMY' : 'SOVIET UNION'} color={colors.gold} opacity={fadeSoviet} />
      {second ? (
        <div style={{position: 'absolute', left: 665, top: 700, display: 'flex', gap: 14}}>
          {['TRADE', 'TAIWAN', 'TECH', 'PACIFIC'].map((item, index) => (
            <div
              key={item}
              style={{
                opacity: interpolate(localFrame, [70 + index * 12, 120 + index * 12], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }),
                color: colors.ink,
                background: 'rgba(183,51,47,0.34)',
                border: '1px solid rgba(242,234,216,0.24)',
                padding: '10px 14px',
                font: '800 20px ui-monospace, monospace',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const Line: React.FC<{x: number; y: number; width: number; rotate: number; progress: number; color: string; thick?: number; opacity?: number}> = ({
  x,
  y,
  width,
  rotate,
  progress,
  color,
  thick = 4,
  opacity = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width,
      height: thick,
      transformOrigin: 'left center',
      transform: `rotate(${rotate}deg) scaleX(${progress})`,
      background: color,
      opacity,
      boxShadow: `0 0 24px ${color}`,
    }}
  />
);

const Node: React.FC<{x: number; y: number; label: string; color: string; opacity?: number}> = ({x, y, label, color, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 210,
      height: 210,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      textAlign: 'center',
      color: colors.ink,
      background: 'rgba(13,17,23,0.84)',
      border: `2px solid ${color}`,
      boxShadow: `0 0 40px ${color}55`,
      font: '900 28px Inter, system-ui, sans-serif',
      opacity,
      padding: 22,
    }}
  >
    {label}
  </div>
);

const TextLayer: React.FC<{beat: Beat; localFrame: number}> = ({beat, localFrame}) => {
  const enter = spring({frame: localFrame - 8, fps: 30, config: {damping: 24, stiffness: 80}});
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 112,
          top: 92,
          width: 950,
          transform: `translateY(${(1 - enter) * 32}px)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            color: colors.red,
            font: '800 24px ui-monospace, monospace',
            letterSpacing: '0.12em',
            marginBottom: 22,
          }}
        >
          {beat.kicker}
        </div>
        <div
          style={{
            color: colors.ink,
            fontFamily: 'Georgia, Times New Roman, serif',
            fontWeight: 800,
            fontSize: 78,
            lineHeight: 0.98,
            textShadow: '0 8px 34px rgba(0,0,0,0.62)',
          }}
        >
          {beat.title}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 112,
          right: 112,
          bottom: 68,
          minHeight: 94,
          display: 'flex',
          alignItems: 'center',
          color: '#fff7e8',
          background: 'rgba(5,8,13,0.82)',
          borderLeft: `6px solid ${colors.red}`,
          padding: '22px 28px',
          font: '600 34px/1.25 Inter, system-ui, sans-serif',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          opacity: interpolate(localFrame, [14, 28], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        }}
      >
        {beat.caption}
      </div>
    </>
  );
};

const BeatScene: React.FC<{beat: Beat}> = ({beat}) => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, beat.duration);
  const triangleSecond = beat.from >= 2100;
  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', background: colors.bg}}>
      {beat.kind === 'modern' ? <NewsTexture localFrame={frame} /> : null}
      {beat.kind === 'modern' ? <ModernMontage localFrame={frame} /> : null}
      {beat.kind === 'archive' ? <ArchiveImage beat={beat} localFrame={frame} /> : null}
      {beat.kind === 'split' ? <SplitScreen localFrame={frame} /> : null}
      {beat.kind === 'triangle' ? <Triangle localFrame={frame} second={triangleSecond} /> : null}
      {beat.kind === 'close' ? <SplitScreen localFrame={frame} /> : null}
      <TextLayer beat={beat} localFrame={frame} />
      <Grain />
    </AbsoluteFill>
  );
};

export const NixonTrumpDraft: React.FC = () => {
  const {durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: colors.bg}}>
      <Audio src={staticFile('assets/voiceover.mp3')} playbackRate={86.121769 / 90} volume={1} />
      <Audio src={staticFile('assets/ambient-bed.mp3')} volume={0.22} />
      {beats.map((beat) => (
        <Sequence key={beat.kicker} from={beat.from} durationInFrames={beat.duration}>
          <BeatScene beat={beat} />
        </Sequence>
      ))}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 6,
          background: `linear-gradient(90deg, ${colors.blue}, ${colors.red})`,
          transformOrigin: 'left center',
          transform: `scaleX(${useCurrentFrame() / durationInFrames})`,
        }}
      />
    </AbsoluteFill>
  );
};
