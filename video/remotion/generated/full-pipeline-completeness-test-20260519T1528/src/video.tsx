import React from "react";
import {
  AbsoluteFill,
  Composition,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import data from "./draft-data.json";

type Beat = {
  id: number;
  durationSeconds: number;
  kind: "title" | "footage" | "archive" | "map";
  narration: string;
  screenText: string;
  assetNeed: string;
  searchKeywords: string;
};

const fps = 30;
const beats = data.beats as Beat[];
const durationInFrames = beats.reduce((sum, beat) => sum + beat.durationSeconds * fps, 0);

const palette = {
  bg: "#0d1117",
  ink: "#f2ead8",
  muted: "#a9b0bb",
  paper: "#d8c7a2",
  red: "#b7332f",
  blue: "#4f7cac",
};

const cumulativeStart = (index: number) =>
  beats.slice(0, index).reduce((sum, beat) => sum + beat.durationSeconds * fps, 0);

const fitText = (text: string, max = 120) =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text;

const EditorialBackground: React.FC<{kind: Beat["kind"]; progress: number}> = ({kind, progress}) => {
  const drift = interpolate(progress, [0, 1], [-18, 18]);
  const accent = kind === "map" ? palette.blue : kind === "archive" ? palette.paper : palette.red;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 28% 26%, rgba(183,51,47,0.24), transparent 27%), radial-gradient(circle at 74% 42%, rgba(79,124,172,0.2), transparent 29%), linear-gradient(135deg, #111722, #07090d 64%, #17120d)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          transform: `translateX(${drift}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 112,
          top: 92,
          width: 560,
          height: 620,
          border: `1px solid ${accent}66`,
          background:
            kind === "footage"
              ? "linear-gradient(135deg, rgba(79,124,172,0.2), rgba(0,0,0,0.25)), repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 22px)"
              : kind === "archive"
                ? "linear-gradient(180deg, rgba(216,199,162,0.24), rgba(0,0,0,0.2)), repeating-linear-gradient(90deg, rgba(242,234,216,0.05) 0 2px, transparent 2px 24px)"
                : "radial-gradient(circle at 40% 45%, rgba(79,124,172,0.28), transparent 18%), radial-gradient(circle at 64% 54%, rgba(183,51,47,0.24), transparent 16%)",
          boxShadow: "0 28px 70px rgba(0,0,0,0.42)",
          transform: `translateY(${drift * -0.6}px) rotate(${kind === "archive" ? -1 : 1}deg)`,
        }}
      >
        <div
          style={{
            margin: 32,
            height: 360,
            border: "1px solid rgba(242,234,216,0.28)",
            display: "grid",
            placeItems: "center",
            color: palette.paper,
            fontSize: 28,
            fontWeight: 800,
            textAlign: "center",
            padding: 28,
          }}
        >
          {kind === "footage" ? "REAL FOOTAGE SLOT" : kind === "archive" ? "ARCHIVAL SLOT" : kind === "map" ? "MAP / GRAPHIC SLOT" : "TITLE"}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.55), transparent 30%, transparent 74%, rgba(0,0,0,0.42)), repeating-linear-gradient(0deg, rgba(255,255,255,0.025), rgba(255,255,255,0.025) 1px, transparent 1px, transparent 4px)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

const BeatScene: React.FC<{beat: Beat; localFrame: number; totalFrames: number}> = ({beat, localFrame, totalFrames}) => {
  const progress = Math.min(1, localFrame / Math.max(1, totalFrames));
  const opacityIn = interpolate(localFrame, [0, 18], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const opacityOut = interpolate(localFrame, [totalFrames - 18, totalFrames], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const opacity = Math.min(opacityIn, opacityOut);
  const y = interpolate(localFrame, [0, 24], [36, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});

  return (
    <AbsoluteFill style={{backgroundColor: palette.bg, color: palette.ink, fontFamily: "Inter, system-ui, sans-serif", opacity}}>
      <EditorialBackground kind={beat.kind} progress={progress} />
      <div style={{position: "absolute", left: 96, top: 88, width: 980, transform: `translateY(${y}px)`}}>
        <div style={{color: palette.red, font: "800 22px ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: 2}}>
          {String(beat.id).padStart(2, "0")} / {beat.kind.toUpperCase()}
        </div>
        <div style={{marginTop: 30, fontFamily: "Georgia, Times New Roman, serif", fontSize: 74, lineHeight: 0.98, fontWeight: 700, maxWidth: 930}}>
          {fitText(beat.screenText, 96)}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 96,
          right: 96,
          bottom: 82,
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr",
          gap: 22,
          alignItems: "stretch",
        }}
      >
        <div style={{borderLeft: `5px solid ${palette.red}`, background: "rgba(9,12,18,0.8)", padding: "20px 24px", fontSize: 30, lineHeight: 1.28}}>
          {fitText(beat.narration, 180)}
        </div>
        <div style={{border: "1px solid rgba(242,234,216,0.22)", background: "rgba(255,255,255,0.05)", padding: 18, color: palette.muted, fontSize: 20, lineHeight: 1.35}}>
          <b style={{color: palette.paper}}>Asset need</b>
          <br />
          {beat.assetNeed}
          <br />
          <br />
          <b style={{color: palette.paper}}>Search</b>
          <br />
          {fitText(beat.searchKeywords, 88)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const RoughCut: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill>
      {beats.map((beat, index) => {
        const from = cumulativeStart(index);
        const duration = beat.durationSeconds * fps;
        return (
          <Sequence key={beat.id} from={from} durationInFrames={duration}>
            <BeatScene beat={beat} localFrame={frame - from} totalFrames={duration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="HistoryRoughCut"
    component={RoughCut}
    durationInFrames={durationInFrames}
    fps={fps}
    width={1920}
    height={1080}
  />
);
