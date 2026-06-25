import type { ReactElement } from "react";

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    type Element = ReactElement;
  }
}
