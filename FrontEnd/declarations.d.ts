declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';

  const content: React.FC<SvgProps>;

  export default content;
}

declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
  };
};
