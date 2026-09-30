## Source Code - Flood Deduction & Impact Assessment System

The core Google Earth Engine (GEE) JavaScript source code modules for the Flood Deduction System are located in this directory:

- [`gfm-v2.js`](./gfm-v2.js): Complete standalone Earth Engine application script containing Sentinel-1 SAR pre-processing, speckle filtering, statistical Z-score water difference computation, DEM slope & permanent water masking, impact assessment analytics, and interactive split-panel map UI.
- [`countrystates.js`](./countrystates.js): Global administrative boundaries module (FAO GAUL Level 1) for automated Region of Interest (AOI) selection.

### Usage in Google Earth Engine Code Editor:
1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Create a new script and copy the contents of `gfm-v2.js`.
3. Click **Run** to launch the interactive portal.
