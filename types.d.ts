declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  import { StyleSheet } from 'react-syntax-highlighter';
  
  export const vs: StyleSheet;
  export const vscDarkPlus: StyleSheet;
  export const tomorrow: StyleSheet;
  export const atomDark: StyleSheet;
  export const dracula: StyleSheet;
  export const materialDark: StyleSheet;
  export const materialLight: StyleSheet;
  export const oneDark: StyleSheet;
  export const oneLight: StyleSheet;
}

declare module 'rehype-raw' {
  import { Plugin } from 'unified';
  const rehypeRaw: Plugin;
  export default rehypeRaw;
}

declare module 'remark-gfm' {
  import { Plugin } from 'unified';
  const remarkGfm: Plugin;
  export default remarkGfm;
} 