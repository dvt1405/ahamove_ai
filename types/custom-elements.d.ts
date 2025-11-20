// Global JSX type declarations for custom web components used in this app
// This prevents TypeScript errors like:
//   Property 'dotlottie-player' does not exist on type 'JSX.IntrinsicElements'
// and enables using the <dotlottie-player> web component in TSX.

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Keep it broad to avoid friction; you can refine the attributes later if needed
      'dotlottie-player': any;
    }
  }
}

export {};