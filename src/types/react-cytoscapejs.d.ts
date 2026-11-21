declare module 'react-cytoscapejs' {
  import cytoscape, { Stylesheet, LayoutOptions, Core } from 'cytoscape';
  import { Component, ReactNode } from 'react';
  interface CytoscapeComponentProps {
    id?: string;
    cy?: (cy: Core) => void;
    style?: Record<string, any>;
    elements?: cytoscape.ElementDefinition[];
    layout?: LayoutOptions;
    stylesheet?: Stylesheet | Stylesheet[];
    className?: string;
    zoom?: number;
    pan?: { x: number; y: number };
    minZoom?: number;
    maxZoom?: number;
    zoomingEnabled?: boolean;
    userZoomingEnabled?: boolean;
    boxSelectionEnabled?: boolean;
    autoungrabify?: boolean;
    autounselectify?: boolean;
    children?: ReactNode;
  }
  class CytoscapeComponent extends Component<CytoscapeComponentProps> {}
  export default CytoscapeComponent;
}
