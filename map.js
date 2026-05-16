// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Your Mapbox token
import { MAPBOX_TOKEN } from './token.js';
mapboxgl.accessToken = MAPBOX_TOKEN;

// Create map
const map = new mapboxgl.Map({
  container: 'map',

  style: 'mapbox://styles/mapbox/streets-v12',

  // Boston/Cambridge area
  center: [-71.09415, 42.36027],

  zoom: 12,

  minZoom: 5,
  maxZoom: 18,
});

// Console check
console.log('Mapbox GL JS Loaded:', mapboxgl);