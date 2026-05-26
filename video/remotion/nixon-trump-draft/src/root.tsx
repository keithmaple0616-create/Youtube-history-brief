import React from 'react';
import {Composition} from 'remotion';
import {NixonTrumpDraft} from './video';

export const Root: React.FC = () => {
  return (
    <Composition
      id="NixonTrumpDraft"
      component={NixonTrumpDraft}
      durationInFrames={2700}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
